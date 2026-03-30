package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type geminiPart struct {
	Text string `json:"text"`
}

type geminiContent struct {
	Role  string       `json:"role,omitempty"` // "user" or "model"
	Parts []geminiPart `json:"parts"`
}

type geminiGenerateRequest struct {
	SystemInstruction *struct {
		Parts []geminiPart `json:"parts"`
	} `json:"systemInstruction,omitempty"`
	Contents         []geminiContent `json:"contents"`
	GenerationConfig *struct {
		Temperature     float64 `json:"temperature,omitempty"`
		MaxOutputTokens int     `json:"maxOutputTokens,omitempty"`
	} `json:"generationConfig,omitempty"`
}

type geminiGenerateResponse struct {
	Candidates []struct {
		Content geminiContent `json:"content"`
	} `json:"candidates"`
}

func generateGeminiReply(ctx context.Context, apiKey, model, systemInstruction string, history []agentTurn, userText string) (string, error) {
	apiKey = strings.TrimSpace(apiKey)
	model = strings.TrimSpace(model)
	if apiKey == "" {
		return "", fmt.Errorf("missing GOOGLE_API_KEY")
	}
	if model == "" {
		model = "gemini-2.0-flash"
	}

	// Build conversation contents from our compact turn history.
	contents := make([]geminiContent, 0, len(history)+1)
	for _, t := range history {
		role := "user"
		if t.Role == "assistant" {
			role = "model"
		}
		text := strings.TrimSpace(t.Text)
		if text == "" {
			continue
		}
		contents = append(contents, geminiContent{Role: role, Parts: []geminiPart{{Text: text}}})
	}
	contents = append(contents, geminiContent{Role: "user", Parts: []geminiPart{{Text: userText}}})

	reqBody := geminiGenerateRequest{
		Contents: contents,
		GenerationConfig: &struct {
			Temperature     float64 `json:"temperature,omitempty"`
			MaxOutputTokens int     `json:"maxOutputTokens,omitempty"`
		}{
			Temperature:     0.4,
			MaxOutputTokens: 220,
		},
	}
	if strings.TrimSpace(systemInstruction) != "" {
		reqBody.SystemInstruction = &struct {
			Parts []geminiPart `json:"parts"`
		}{Parts: []geminiPart{{Text: systemInstruction}}}
	}

	jsonBytes, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}

	// v1beta generateContent endpoint.
	endpoint := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", url.PathEscape(model), url.QueryEscape(apiKey))

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewBuffer(jsonBytes))
	if err != nil {
		return "", err
	}
	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 15 * time.Second}
	httpResp, err := client.Do(httpReq)
	if err != nil {
		return "", err
	}
	defer httpResp.Body.Close()

	respBody, _ := io.ReadAll(httpResp.Body)
	if httpResp.StatusCode >= 300 {
		// Avoid leaking the API key (not present in body), but keep body for debugging.
		return "", fmt.Errorf("gemini API status %d: %s", httpResp.StatusCode, strings.TrimSpace(string(respBody)))
	}

	var parsed geminiGenerateResponse
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return "", err
	}
	if len(parsed.Candidates) == 0 {
		return "", fmt.Errorf("no candidates")
	}
	c := parsed.Candidates[0].Content
	if len(c.Parts) == 0 {
		return "", fmt.Errorf("empty response")
	}
	return strings.TrimSpace(c.Parts[0].Text), nil
}

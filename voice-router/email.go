package main

import (
	"fmt"
	"log/slog"
	"net/smtp"
	"strings"
	"time"
)

// sendVoicemailEmail emails a voicemail notification with a link to the recording.
func sendVoicemailEmail(to, callerNumber, recordingURL string, receivedAt time.Time) error {
	subject := fmt.Sprintf("New Voicemail from %s", formatCallerNumber(callerNumber))

	body := buildEmailBody(callerNumber, recordingURL, receivedAt)

	msg := buildMIMEMessage(cfg.SMTPFromAddr, cfg.SMTPFromName, to, subject, body)

	addr := fmt.Sprintf("%s:%s", cfg.SMTPHost, cfg.SMTPPort)
	auth := smtp.PlainAuth("", cfg.SMTPUser, cfg.SMTPPass, cfg.SMTPHost)

	slog.Info("Sending voicemail email", "smtp", addr, "from", cfg.SMTPFromAddr, "to", to)

	if err := smtp.SendMail(addr, auth, cfg.SMTPFromAddr, []string{to}, []byte(msg)); err != nil {
		return fmt.Errorf("smtp.SendMail: %w", err)
	}
	return nil
}

func buildEmailBody(callerNumber, recordingURL string, receivedAt time.Time) string {
	est, _ := time.LoadLocation("America/New_York")
	formatted := receivedAt.In(est).Format("Monday, January 2, 2006 at 3:04 PM MST")

	return fmt.Sprintf(`You have received a new voicemail.

Caller:     %s
Received:   %s

Recording:
%s

--
Store Phone System
This is an automated notification. Do not reply to this email.
`, formatCallerNumber(callerNumber), formatted, recordingURL)
}

func buildMIMEMessage(fromAddr, fromName, to, subject, body string) string {
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("From: %s <%s>\r\n", fromName, fromAddr))
	sb.WriteString(fmt.Sprintf("To: %s\r\n", to))
	sb.WriteString(fmt.Sprintf("Subject: %s\r\n", subject))
	sb.WriteString("MIME-Version: 1.0\r\n")
	sb.WriteString("Content-Type: text/plain; charset=UTF-8\r\n")
	sb.WriteString("\r\n")
	sb.WriteString(body)
	return sb.String()
}

func formatCallerNumber(number string) string {
	// Basic formatting: +14073082412 -> (407) 308-2412
	digits := strings.Map(func(r rune) rune {
		if r >= '0' && r <= '9' {
			return r
		}
		return -1
	}, number)

	if len(digits) == 11 && digits[0] == '1' {
		digits = digits[1:]
	}
	if len(digits) == 10 {
		return fmt.Sprintf("(%s) %s-%s", digits[:3], digits[3:6], digits[6:])
	}
	return number
}

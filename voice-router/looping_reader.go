package main

import (
    "io"
    "os"
    "sync"
)

type loopingFileReader struct {
    filenames []string
    idx       int
    current   *os.File
    mu        sync.Mutex
}

func NewLoopingFileReader(filenames []string) *loopingFileReader {
    return &loopingFileReader{
        filenames: filenames,
    }
}

func (l *loopingFileReader) Read(p []byte) (n int, err error) {
    l.mu.Lock()
    defer l.mu.Unlock()

    if l.current == nil {
        file, err := os.Open(l.filenames[l.idx])
        if err != nil {
            return 0, err
        }
        l.current = file
    }

    n, err = l.current.Read(p)
    if err == io.EOF {
        l.current.Close()
        l.current = nil
        l.idx = (l.idx + 1) % len(l.filenames)
        if n == 0 {
            // Recursively read from the next file
            l.mu.Unlock()
            n, err = l.Read(p)
            l.mu.Lock()
            return n, err
        }
        return n, nil
    }
    return n, err
}

func (l *loopingFileReader) Close() error {
    l.mu.Lock()
    defer l.mu.Unlock()
    if l.current != nil {
        return l.current.Close()
    }
    return nil
}

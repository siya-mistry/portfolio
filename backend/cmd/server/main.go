// Command server runs the contact API locally for development.
//
//	cd backend && go run ./cmd/server
//
// It listens on :8080 (override with PORT) and the Vite dev server proxies
// /api requests here (see frontend/vite.config.ts).
package main

import (
	"log"
	"net/http"
	"os"

	"siyonamistry.com/portfolio/backend/contact"
)

func main() {
	cfg := contact.LoadConfig()

	mux := http.NewServeMux()
	mux.HandleFunc("/api/contact", contact.Handler(cfg))
	mux.HandleFunc("/api/health", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("contact API listening on http://localhost:%s", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatal(err)
	}
}

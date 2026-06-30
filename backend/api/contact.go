// Package handler is the serverless entry point for the contact endpoint.
//
// Platforms like Vercel auto-discover an exported `Handler` in files under
// /api and route HTTP requests to it — no main() or server bootstrap needed.
// The actual logic lives in the contact package so it stays identical to the
// local dev server.
//
// To deploy on Vercel: point the project root at `backend/` (or copy this
// file to an `api/` dir at your deploy root). Set SMTP_* env vars in the
// dashboard. See backend/README.md.
package handler

import (
	"net/http"

	"siyonamistry.com/portfolio/backend/contact"
)

// Handler is the exported serverless function entry point.
func Handler(w http.ResponseWriter, r *http.Request) {
	contact.Handler(contact.LoadConfig())(w, r)
}

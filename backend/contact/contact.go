// Package contact implements the portfolio contact-form endpoint.
//
// The core is a plain http.HandlerFunc (Handler) with no framework and no
// global state, so the exact same code runs three ways:
//   - the local dev server (backend/cmd/server)
//   - a Vercel/Netlify serverless function (backend/api/contact.go)
//   - any other net/http mux
package contact

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/smtp"
	"os"
	"strings"
)

// request is the JSON body posted by the frontend contact form.
type request struct {
	Name    string `json:"name"`
	Email   string `json:"email"`
	Message string `json:"message"`
}

// Config is loaded from environment variables. When SMTP settings are absent
// the handler still works — it logs the message instead of emailing it — so the
// API runs out of the box with zero configuration.
type Config struct {
	SMTPHost    string // e.g. smtp.gmail.com
	SMTPPort    string // e.g. 587
	SMTPUser    string // SMTP username
	SMTPPass    string // SMTP password / app password
	ToAddress   string // where contact messages are delivered
	FromAddress string // envelope From (defaults to SMTPUser)
	AllowOrigin string // CORS allow-origin; defaults to "*"
}

// LoadConfig reads configuration from the environment.
func LoadConfig() Config {
	from := getenv("CONTACT_FROM", os.Getenv("SMTP_USER"))
	return Config{
		SMTPHost:    os.Getenv("SMTP_HOST"),
		SMTPPort:    getenv("SMTP_PORT", "587"),
		SMTPUser:    os.Getenv("SMTP_USER"),
		SMTPPass:    os.Getenv("SMTP_PASS"),
		ToAddress:   getenv("CONTACT_TO", os.Getenv("SMTP_USER")),
		FromAddress: from,
		AllowOrigin: getenv("CORS_ALLOW_ORIGIN", "*"),
	}
}

// Handler returns an http.HandlerFunc bound to the given config.
func Handler(cfg Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", cfg.AllowOrigin)
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		// CORS preflight.
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		if r.Method != http.MethodPost {
			writeErr(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		var req request
		// Cap the body to a sane size to avoid abuse.
		r.Body = http.MaxBytesReader(w, r.Body, 1<<20) // 1 MiB
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeErr(w, http.StatusBadRequest, "invalid JSON body")
			return
		}

		req.Name = strings.TrimSpace(req.Name)
		req.Email = strings.TrimSpace(req.Email)
		req.Message = strings.TrimSpace(req.Message)

		if msg := validate(req); msg != "" {
			writeErr(w, http.StatusBadRequest, msg)
			return
		}

		if err := deliver(cfg, req); err != nil {
			log.Printf("contact: delivery failed: %v", err)
			writeErr(w, http.StatusBadGateway, "could not send message, please email directly")
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]bool{"ok": true})
	}
}

// validate returns an empty string when the request is valid, otherwise a
// human-readable error message.
func validate(req request) string {
	switch {
	case req.Name == "":
		return "name is required"
	case req.Email == "" || !strings.Contains(req.Email, "@") || !strings.Contains(req.Email, "."):
		return "a valid email is required"
	case len(req.Message) < 5:
		return "message is too short"
	case len(req.Message) > 5000:
		return "message is too long"
	default:
		return ""
	}
}

// deliver sends the message via SMTP, or logs it when SMTP is not configured.
func deliver(cfg Config, req request) error {
	if cfg.SMTPHost == "" || cfg.SMTPUser == "" || cfg.SMTPPass == "" {
		// Dev / unconfigured fallback: don't drop the message, surface it.
		log.Printf("contact (no SMTP configured) — from %s <%s>:\n%s",
			req.Name, req.Email, req.Message)
		return nil
	}

	subject := fmt.Sprintf("Portfolio contact from %s", req.Name)
	body := fmt.Sprintf(
		"You have a new message from your portfolio site.\n\nName:  %s\nEmail: %s\n\nMessage:\n%s\n",
		req.Name, req.Email, req.Message,
	)
	msg := strings.Join([]string{
		"From: " + cfg.FromAddress,
		"To: " + cfg.ToAddress,
		"Reply-To: " + req.Email,
		"Subject: " + subject,
		"MIME-Version: 1.0",
		"Content-Type: text/plain; charset=UTF-8",
		"",
		body,
	}, "\r\n")

	auth := smtp.PlainAuth("", cfg.SMTPUser, cfg.SMTPPass, cfg.SMTPHost)
	addr := cfg.SMTPHost + ":" + cfg.SMTPPort
	return smtp.SendMail(addr, auth, cfg.FromAddress, []string{cfg.ToAddress}, []byte(msg))
}

func writeErr(w http.ResponseWriter, code int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": message})
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

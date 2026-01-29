package main

import (
	"crypto/tls"
	"log"
	"net/http"
	"os"

	"github.com/pocketbase/pocketbase"
)

func main() {
	if os.Getenv("DISABLE_SSL_VERIFY") == "true" {
		http.DefaultTransport.(*http.Transport).TLSClientConfig = &tls.Config{
			InsecureSkipVerify: true,
		}
		log.Println("WARNING: SSL/TLS certificate verification is disabled globally")
	}

	app := pocketbase.New()

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}

package main

import (
	"crypto/tls"
	"log"
	"net/http"
	"os"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/plugins/jsvm"
	"github.com/pocketbase/pocketbase/plugins/migratecmd"
)

func main() {
	if os.Getenv("DISABLE_SSL_VERIFY") == "true" {
		http.DefaultTransport.(*http.Transport).TLSClientConfig = &tls.Config{
			InsecureSkipVerify: true,
		}
		log.Println("WARNING: SSL/TLS certificate verification is disabled globally")
	}

	app := pocketbase.New()

	// Register the JSVM plugin to load pb_hooks/*.pb.js and pb_migrations/*.js
	jsvm.MustRegister(app, jsvm.Config{
		HooksWatch: true,
	})

	// Register the migrate command with JS template support
	migratecmd.MustRegister(app, app.RootCmd, migratecmd.Config{
		TemplateLang: migratecmd.TemplateLangJS,
		Automigrate:  true,
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}

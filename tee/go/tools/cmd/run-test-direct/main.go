package main

import (
	"flag"
	"os"
	"time"

	"sign-tools/app"
	"sign-tools/base"
	"sign-tools/base/fccutils"

	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()
	_ = godotenv.Load("../../.env")

	defaultAPIKey := os.Getenv("DIRECT_API_KEY")

	pf := flag.String("p", base.DefaultExtensionProxyURL, "extension proxy url")
	apiKeyF := flag.String("api-key", defaultAPIKey, "API key for /direct endpoint (or set DIRECT_API_KEY in .env)")
	timeoutF := flag.Duration("timeout", 120*time.Second, "poll timeout for instruction results")
	flag.Parse()

	err := app.RunE2ETestDirect(*pf, *apiKeyF, *timeoutF)
	if err != nil {
		fccutils.FatalWithCause(err)
	}
}

package main

import (
	"flag"
	"os"

	"sign-tools/app"
	"sign-tools/base"
	"sign-tools/base/fccutils"

	"github.com/ethereum/go-ethereum/common"
	"github.com/flare-foundation/go-flare-common/pkg/logger"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()
	_ = godotenv.Load("../../.env")
	_ = godotenv.Load("../../../.env")

	defaultInstructionSender := os.Getenv("INSTRUCTION_SENDER")
	af := flag.String("a", base.DefaultAddressesFile, "file with deployed addresses")
	cf := flag.String("c", base.DefaultChainNodeURL, "chain node url")
	instructionSenderF := flag.String("instructionSender", defaultInstructionSender, "InstructionSender contract address")
	flag.Parse()

	if *instructionSenderF == "" {
		logger.Fatal("--instructionSender flag is required (or set INSTRUCTION_SENDER in .env)")
	}

	addr := common.HexToAddress(*instructionSenderF)
	support, err := base.DefaultSupport(*af, *cf)
	if err != nil {
		fccutils.FatalWithCause(err)
	}

	logger.Infof("Calling setExtensionId on %s ...", addr.Hex())
	if err := app.SetExtensionId(support, addr); err != nil {
		fccutils.FatalWithCause(err)
	}
	logger.Infof("setExtensionId OK (already set or newly set)")
}

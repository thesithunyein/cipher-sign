// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package sign

import (
	"errors"
	"math/big"
	"strings"

	ethereum "github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/event"
)

// Reference imports to suppress errors if they are not otherwise used.
var (
	_ = errors.New
	_ = big.NewInt
	_ = strings.NewReader
	_ = ethereum.NotFound
	_ = bind.Bind
	_ = common.Big1
	_ = types.BloomLookup
	_ = event.NewSubscription
	_ = abi.ConvertType
)

// InstructionSenderMetaData contains all meta data concerning the InstructionSender contract.
var InstructionSenderMetaData = &bind.MetaData{
	ABI: "[{\"type\":\"constructor\",\"inputs\":[{\"name\":\"_teeExtensionRegistry\",\"type\":\"address\",\"internalType\":\"contractITeeExtensionRegistry\"},{\"name\":\"_teeMachineRegistry\",\"type\":\"address\",\"internalType\":\"contractITeeMachineRegistry\"}],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"OP_COMMAND_SET_POLICY\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"OP_COMMAND_SIGN\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"OP_COMMAND_UPDATE\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"OP_TYPE_KEY\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"TEE_EXTENSION_REGISTRY\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"address\",\"internalType\":\"contractITeeExtensionRegistry\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"TEE_MACHINE_REGISTRY\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"address\",\"internalType\":\"contractITeeMachineRegistry\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"_extensionId\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"setExtensionId\",\"inputs\":[],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"setPolicy\",\"inputs\":[{\"name\":\"_policy\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"outputs\":[],\"stateMutability\":\"payable\"},{\"type\":\"function\",\"name\":\"sign\",\"inputs\":[{\"name\":\"_message\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"outputs\":[],\"stateMutability\":\"payable\"},{\"type\":\"function\",\"name\":\"updateKey\",\"inputs\":[{\"name\":\"_encryptedKey\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"outputs\":[],\"stateMutability\":\"payable\"}]",
	Bin: "0x60c06040523461005e5761001a61001461016d565b90610478565b610022610063565b61119f61052582396080518181816101ca015281816108860152818161090f0152610fe0015260a0518181816104ae0152610eda015261119f90f35b610069565b60405190565b5f80fd5b601f801991011690565b634e487b7160e01b5f52604160045260245ffd5b906100959061006d565b810190811060018060401b038211176100ad57604052565b610077565b906100c56100be610063565b928361008b565b565b5f80fd5b60018060a01b031690565b6100df906100cb565b90565b6100eb906100d6565b90565b6100f7816100e2565b036100fe57565b5f80fd5b9050519061010f826100ee565b565b61011a906100d6565b90565b61012681610111565b0361012d57565b5f80fd5b9050519061013e8261011d565b565b9190604083820312610168578061015c610165925f8601610102565b93602001610131565b90565b6100c7565b61018b6116c480380380610180816100b2565b928339810190610140565b9091565b90565b6101a66101a16101ab926100cb565b61018f565b6100cb565b90565b6101b790610192565b90565b6101c3906101ae565b90565b90565b6101dd6101d86101e2926101c6565b61018f565b6100cb565b90565b6101ee906101c9565b90565b60209181520190565b60207f65726f2061646472657373000000000000000000000000000000000000000000917f546565457874656e73696f6e52656769737472792063616e6e6f74206265207a5f8201520152565b610254602b6040926101f1565b61025d816101fa565b0190565b6102769060208101905f818303910152610247565b90565b1561028057565b610288610063565b62461bcd60e51b81528061029e60048201610261565b0390fd5b6102ab906101ae565b90565b60207f6f20616464726573730000000000000000000000000000000000000000000000917f5465654d616368696e6552656769737472792063616e6e6f74206265207a65725f8201520152565b61030860296040926101f1565b610311816102ae565b0190565b61032a9060208101905f8183039101526102fb565b90565b1561033457565b61033c610063565b62461bcd60e51b81528061035260048201610315565b0390fd5b90565b61036d610368610372926101c6565b61018f565b610356565b90565b5f7f546565457874656e73696f6e526567697374727920686173206e6f20636f6465910152565b6103a8602080926101f1565b6103b181610375565b0190565b6103ca9060208101905f81830391015261039c565b90565b156103d457565b6103dc610063565b62461bcd60e51b8152806103f2600482016103b5565b0390fd5b5f7f5465654d616368696e65526567697374727920686173206e6f20636f64650000910152565b61042a601e6020926101f1565b610433816103f6565b0190565b61044c9060208101905f81830391015261041d565b90565b1561045657565b61045e610063565b62461bcd60e51b81528061047460048201610437565b0390fd5b6104a5610484826101ba565b61049e6104986104935f6101e5565b6100d6565b916100d6565b1415610279565b6104d26104b1836102a2565b6104cb6104c56104c05f6101e5565b6100d6565b916100d6565b141561032d565b6104f76104de826101ba565b3b6104f16104eb5f610359565b91610356565b116103cd565b61051c610503836102a2565b3b6105166105105f610359565b91610356565b1161044f565b60805260a05256fe60806040526004361015610013575b610587565b61001d5f356100cc565b806301207040146100c757806320fc9407146100c257806334759513146100bd57806356c4e670146100b857806376cd7cbc146100b3578063aa5032c6146100ae578063c5028bbb146100a9578063d473e270146100a4578063d77798a91461009f578063d82534281461009a5763e6eb68670361000e5761055d565b610533565b6104fe565b610477565b6103e2565b61038f565b610365565b6102a6565b610250565b610193565b61013b565b60e01c90565b60405190565b5f80fd5b5f80fd5b5f9103126100ea57565b6100dc565b695345545f504f4c49435960b01b90565b6101086100ef565b90565b610113610100565b90565b90565b61012290610116565b9052565b9190610139905f60208501940190610119565b565b3461016b5761014b3660046100e0565b61016761015661010b565b61015e6100d2565b91829182610126565b0390f35b6100d8565b6555504441544560d01b90565b610185610170565b90565b61019061017d565b90565b346101c3576101a33660046100e0565b6101bf6101ae610188565b6101b66100d2565b91829182610126565b0390f35b6100d8565b7f000000000000000000000000000000000000000000000000000000000000000090565b60018060a01b031690565b90565b61020e610209610213926101ec565b6101f7565b6101ec565b90565b61021f906101fa565b90565b61022b90610216565b90565b61023790610222565b9052565b919061024e905f6020850194019061022e565b565b34610280576102603660046100e0565b61027c61026b6101c8565b6102736100d2565b9182918261023b565b0390f35b6100d8565b6329a4a3a760e11b90565b610298610285565b90565b6102a3610290565b90565b346102d6576102b63660046100e0565b6102d26102c161029b565b6102c96100d2565b91829182610126565b0390f35b6100d8565b5f80fd5b5f80fd5b5f80fd5b5f80fd5b909182601f830112156103255781359167ffffffffffffffff831161032057602001926001830284011161031b57565b6102e7565b6102e3565b6102df565b9060208282031261035b575f82013567ffffffffffffffff81116103565761035292016102eb565b9091565b6102db565b6100dc565b5f0190565b61037961037336600461032a565b9061058b565b6103816100d2565b8061038b81610360565b0390f35b346103bd5761039f3660046100e0565b6103a7610858565b6103af6100d2565b806103b981610360565b0390f35b6100d8565b624b455960e81b90565b6103d46103c2565b90565b6103df6103cc565b90565b34610412576103f23660046100e0565b61040e6103fd6103d7565b6104056100d2565b91829182610126565b0390f35b6100d8565b1c90565b90565b61042e9060086104339302610417565b61041b565b90565b90610441915461041e565b90565b61044f5f5f90610436565b90565b90565b61045e90610452565b9052565b9190610475905f60208501940190610455565b565b346104a7576104873660046100e0565b6104a3610492610444565b61049a6100d2565b91829182610462565b0390f35b6100d8565b7f000000000000000000000000000000000000000000000000000000000000000090565b6104d990610216565b90565b6104e5906104d0565b9052565b91906104fc905f602085019401906104dc565b565b3461052e5761050e3660046100e0565b61052a6105196104ac565b6105216100d2565b918291826104e9565b0390f35b6100d8565b61054761054136600461032a565b90610a32565b61054f6100d2565b8061055981610360565b0390f35b61057161056b36600461032a565b90610a48565b6105796100d2565b8061058381610360565b0390f35b5f80fd5b61059f91610597610290565b919091610ed4565b565b5f1c90565b6105b26105b7916105a1565b61041b565b90565b6105c490546105a6565b90565b90565b6105de6105d96105e3926105c7565b6101f7565b610452565b90565b60209181520190565b5f7f457874656e73696f6e20494420616c7265616479207365742e00000000000000910152565b61062360196020926105e6565b61062c816105ef565b0190565b6106459060208101905f818303910152610616565b90565b1561064f57565b6106576100d2565b62461bcd60e51b81528061066d60048201610630565b0390fd5b601f801991011690565b634e487b7160e01b5f52604160045260245ffd5b9061069990610671565b810190811067ffffffffffffffff8211176106b357604052565b61067b565b60e01b90565b6106c781610452565b036106ce57565b5f80fd5b905051906106df826106be565b565b906020828203126106fa576106f7915f016106d2565b90565b6100dc565b6107076100d2565b3d5f823e3d90fd5b90565b61072661072161072b9261070f565b6101f7565b610452565b90565b61073a62010000610712565b90565b60016107499101610452565b90565b610755906101ec565b90565b6107618161074c565b0361076857565b5f80fd5b9050519061077982610758565b565b9060208282031261079457610791915f0161076c565b90565b6100dc565b6107a290610216565b90565b5f1b90565b906107b65f19916107a5565b9181191691161790565b6107d46107cf6107d992610452565b6101f7565b610452565b90565b90565b906107f46107ef6107fb926107c0565b6107dc565b82546107aa565b9055565b5f7f457874656e73696f6e204944206e6f7420666f756e642e000000000000000000910152565b61083360176020926105e6565b61083c816107ff565b0190565b6108559060208101905f818303910152610826565b90565b61087c6108645f6105ba565b6108766108705f6105ca565b91610452565b14610648565b6108c060206108aa7f0000000000000000000000000000000000000000000000000000000000000000610222565b6327582ad5906108b86100d2565b9384926106b8565b825281806108d060048201610360565b03915afa908115610a2d575f916109ff575b506108eb61072e565b5b806108ff6108f984610452565b91610452565b10156109dd5761095d60206109337f0000000000000000000000000000000000000000000000000000000000000000610222565b632c1773589061095285926109466100d2565b958694859384936106b8565b835260048301610462565b03915afa9081156109d8575f916109aa575b5061098a61098461097f30610799565b61074c565b9161074c565b1461099d576109989061073d565b6108ec565b6109a891505f6107df565b565b6109cb915060203d81116109d1575b6109c3818361068f565b81019061077b565b5f61096f565b503d6109b9565b6106ff565b6109e56100d2565b62461bcd60e51b8152806109fb60048201610840565b0390fd5b610a20915060203d8111610a26575b610a18818361068f565b8101906106e1565b5f6108e2565b503d610a0e565b6106ff565b610a4691610a3e610100565b919091610ed4565b565b610a5c91610a5461017d565b919091610ed4565b565b90610a71610a6a6100d2565b928361068f565b565b67ffffffffffffffff8111610a8b5760208091020190565b61067b565b90929192610aa5610aa082610a73565b610a5e565b9381855260208086019202830192818411610ae257915b838310610ac95750505050565b60208091610ad7848661076c565b815201920191610abc565b6102e7565b9080601f83011215610b0557816020610b0293519101610a90565b90565b6102df565b90602082820312610b3a575f82015167ffffffffffffffff8111610b3557610b329201610ae7565b90565b6102db565b6100dc565b90565b610b56610b51610b5b92610b3f565b6101f7565b610452565b90565b610b6790610b42565b9052565b916020610b8c929493610b8560408201965f830190610455565b0190610b5e565b565b90610ba0610b9b83610a73565b610a5e565b918252565b369037565b90610bcf610bb783610b8e565b92602080610bc58693610a73565b9201910390610ba5565b565b610bdb60c0610a5e565b90565b90610be890610116565b9052565b5f80fd5b67ffffffffffffffff8111610c0e57610c0a602091610671565b0190565b61067b565b90825f939282370152565b90929192610c33610c2e82610bf0565b610a5e565b93818552602085019082840111610c4f57610c4d92610c13565b565b610bec565b610c5f913691610c1e565b90565b52565b52565b67ffffffffffffffff1690565b610c89610c84610c8e926105c7565b6101f7565b610c68565b90565b90610c9b90610c68565b9052565b90610ca99061074c565b9052565b610cb681610116565b03610cbd57565b5f80fd5b90505190610cce82610cad565b565b90602082820312610ce957610ce6915f01610cc1565b90565b6100dc565b5190565b60209181520190565b60200190565b610d0a9061074c565b9052565b90610d1b81602093610d01565b0190565b60200190565b90610d42610d3c610d3584610cee565b8093610cf2565b92610cfb565b905f5b818110610d525750505090565b909192610d6b610d656001928651610d0e565b94610d1f565b9101919091610d45565b610d7e90610116565b9052565b5190565b60209181520190565b90825f9392825e0152565b610db9610dc2602093610dc793610db081610d82565b93848093610d86565b95869101610d8f565b610671565b0190565b60209181520190565b90610df1610deb610de484610cee565b8093610dcb565b92610cfb565b905f5b818110610e015750505090565b909192610e1a610e146001928651610d0e565b94610d1f565b9101919091610df4565b610e2d90610c68565b9052565b90610ea69060a080610e89610e7760c08501610e535f8901515f880190610d75565b610e6560208901516020880190610d75565b60408801518682036040880152610d9a565b60608701518582036060870152610dd4565b94610e9c60808201516080860190610e24565b0151910190610d01565b90565b9091610ec3610ed19360408401908482035f860152610d25565b916020818403910152610e31565b90565b90610efe7f00000000000000000000000000000000000000000000000000000000000000006104d0565b5f63feeabcbf91610f0d61112f565b90610f2b600194610f36610f1f6100d2565b968795869485946106b8565b845260048401610b6b565b03915afa9081156110a4575f91611082575b50925f610f54906105ca565b610f5d90610baa565b90610f666103cc565b93929091905f923394610f77610bd1565b965f880190610f8591610bde565b6020870190610f9391610bde565b610f9c91610c54565b6040850190610faa91610c62565b6060840190610fb891610c65565b610fc190610c75565b6080830190610fcf91610c91565b60a0820190610fdd91610c9f565b907f000000000000000000000000000000000000000000000000000000000000000061100890610222565b63f731df53913491929190939161101d6100d2565b8095819461102b83946106b8565b8352600483019161103b92610ea9565b03915a94602095f1801561107d57611051575b50565b6110719060203d8111611076575b611069818361068f565b810190610cd0565b61104e565b503d61105f565b6106ff565b61109e91503d805f833e611096818361068f565b810190610b0a565b5f610f48565b6106ff565b5f90565b5f7f457874656e73696f6e204944206973206e6f74207365742e0000000000000000910152565b6110e160186020926105e6565b6110ea816110ad565b0190565b6111039060208101905f8183039101526110d4565b90565b1561110d57565b6111156100d2565b62461bcd60e51b81528061112b600482016110ee565b0390fd5b6111376110a9565b5061115d6111445f6105ba565b6111566111505f6105ca565b91610452565b1415611106565b6111665f6105ba565b9056fea26469706673582212200d39dbb5d8a595387e8239310ccf6b47c2cf047d5c7e53481626bfb33ae628da64736f6c63430008230033",
}

// InstructionSenderABI is the input ABI used to generate the binding from.
// Deprecated: Use InstructionSenderMetaData.ABI instead.
var InstructionSenderABI = InstructionSenderMetaData.ABI

// InstructionSenderBin is the compiled bytecode used for deploying new contracts.
// Deprecated: Use InstructionSenderMetaData.Bin instead.
var InstructionSenderBin = InstructionSenderMetaData.Bin

// DeployInstructionSender deploys a new Ethereum contract, binding an instance of InstructionSender to it.
func DeployInstructionSender(auth *bind.TransactOpts, backend bind.ContractBackend, _teeExtensionRegistry common.Address, _teeMachineRegistry common.Address) (common.Address, *types.Transaction, *InstructionSender, error) {
	parsed, err := InstructionSenderMetaData.GetAbi()
	if err != nil {
		return common.Address{}, nil, nil, err
	}
	if parsed == nil {
		return common.Address{}, nil, nil, errors.New("GetABI returned nil")
	}

	address, tx, contract, err := bind.DeployContract(auth, *parsed, common.FromHex(InstructionSenderBin), backend, _teeExtensionRegistry, _teeMachineRegistry)
	if err != nil {
		return common.Address{}, nil, nil, err
	}
	return address, tx, &InstructionSender{InstructionSenderCaller: InstructionSenderCaller{contract: contract}, InstructionSenderTransactor: InstructionSenderTransactor{contract: contract}, InstructionSenderFilterer: InstructionSenderFilterer{contract: contract}}, nil
}

// InstructionSender is an auto generated Go binding around an Ethereum contract.
type InstructionSender struct {
	InstructionSenderCaller     // Read-only binding to the contract
	InstructionSenderTransactor // Write-only binding to the contract
	InstructionSenderFilterer   // Log filterer for contract events
}

// InstructionSenderCaller is an auto generated read-only Go binding around an Ethereum contract.
type InstructionSenderCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// InstructionSenderTransactor is an auto generated write-only Go binding around an Ethereum contract.
type InstructionSenderTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// InstructionSenderFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type InstructionSenderFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// InstructionSenderSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type InstructionSenderSession struct {
	Contract     *InstructionSender // Generic contract binding to set the session for
	CallOpts     bind.CallOpts      // Call options to use throughout this session
	TransactOpts bind.TransactOpts  // Transaction auth options to use throughout this session
}

// InstructionSenderCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type InstructionSenderCallerSession struct {
	Contract *InstructionSenderCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts            // Call options to use throughout this session
}

// InstructionSenderTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type InstructionSenderTransactorSession struct {
	Contract     *InstructionSenderTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts            // Transaction auth options to use throughout this session
}

// InstructionSenderRaw is an auto generated low-level Go binding around an Ethereum contract.
type InstructionSenderRaw struct {
	Contract *InstructionSender // Generic contract binding to access the raw methods on
}

// InstructionSenderCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type InstructionSenderCallerRaw struct {
	Contract *InstructionSenderCaller // Generic read-only contract binding to access the raw methods on
}

// InstructionSenderTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type InstructionSenderTransactorRaw struct {
	Contract *InstructionSenderTransactor // Generic write-only contract binding to access the raw methods on
}

// NewInstructionSender creates a new instance of InstructionSender, bound to a specific deployed contract.
func NewInstructionSender(address common.Address, backend bind.ContractBackend) (*InstructionSender, error) {
	contract, err := bindInstructionSender(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &InstructionSender{InstructionSenderCaller: InstructionSenderCaller{contract: contract}, InstructionSenderTransactor: InstructionSenderTransactor{contract: contract}, InstructionSenderFilterer: InstructionSenderFilterer{contract: contract}}, nil
}

// NewInstructionSenderCaller creates a new read-only instance of InstructionSender, bound to a specific deployed contract.
func NewInstructionSenderCaller(address common.Address, caller bind.ContractCaller) (*InstructionSenderCaller, error) {
	contract, err := bindInstructionSender(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &InstructionSenderCaller{contract: contract}, nil
}

// NewInstructionSenderTransactor creates a new write-only instance of InstructionSender, bound to a specific deployed contract.
func NewInstructionSenderTransactor(address common.Address, transactor bind.ContractTransactor) (*InstructionSenderTransactor, error) {
	contract, err := bindInstructionSender(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &InstructionSenderTransactor{contract: contract}, nil
}

// NewInstructionSenderFilterer creates a new log filterer instance of InstructionSender, bound to a specific deployed contract.
func NewInstructionSenderFilterer(address common.Address, filterer bind.ContractFilterer) (*InstructionSenderFilterer, error) {
	contract, err := bindInstructionSender(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &InstructionSenderFilterer{contract: contract}, nil
}

// bindInstructionSender binds a generic wrapper to an already deployed contract.
func bindInstructionSender(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := InstructionSenderMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_InstructionSender *InstructionSenderRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _InstructionSender.Contract.InstructionSenderCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_InstructionSender *InstructionSenderRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _InstructionSender.Contract.InstructionSenderTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_InstructionSender *InstructionSenderRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _InstructionSender.Contract.InstructionSenderTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_InstructionSender *InstructionSenderCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _InstructionSender.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_InstructionSender *InstructionSenderTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _InstructionSender.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_InstructionSender *InstructionSenderTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _InstructionSender.Contract.contract.Transact(opts, method, params...)
}

// OPCOMMANDSETPOLICY is a free data retrieval call binding the contract method 0x01207040.
//
// Solidity: function OP_COMMAND_SET_POLICY() view returns(bytes32)
func (_InstructionSender *InstructionSenderCaller) OPCOMMANDSETPOLICY(opts *bind.CallOpts) ([32]byte, error) {
	var out []interface{}
	err := _InstructionSender.contract.Call(opts, &out, "OP_COMMAND_SET_POLICY")

	if err != nil {
		return *new([32]byte), err
	}

	out0 := *abi.ConvertType(out[0], new([32]byte)).(*[32]byte)

	return out0, err

}

// OPCOMMANDSETPOLICY is a free data retrieval call binding the contract method 0x01207040.
//
// Solidity: function OP_COMMAND_SET_POLICY() view returns(bytes32)
func (_InstructionSender *InstructionSenderSession) OPCOMMANDSETPOLICY() ([32]byte, error) {
	return _InstructionSender.Contract.OPCOMMANDSETPOLICY(&_InstructionSender.CallOpts)
}

// OPCOMMANDSETPOLICY is a free data retrieval call binding the contract method 0x01207040.
//
// Solidity: function OP_COMMAND_SET_POLICY() view returns(bytes32)
func (_InstructionSender *InstructionSenderCallerSession) OPCOMMANDSETPOLICY() ([32]byte, error) {
	return _InstructionSender.Contract.OPCOMMANDSETPOLICY(&_InstructionSender.CallOpts)
}

// OPCOMMANDSIGN is a free data retrieval call binding the contract method 0x56c4e670.
//
// Solidity: function OP_COMMAND_SIGN() view returns(bytes32)
func (_InstructionSender *InstructionSenderCaller) OPCOMMANDSIGN(opts *bind.CallOpts) ([32]byte, error) {
	var out []interface{}
	err := _InstructionSender.contract.Call(opts, &out, "OP_COMMAND_SIGN")

	if err != nil {
		return *new([32]byte), err
	}

	out0 := *abi.ConvertType(out[0], new([32]byte)).(*[32]byte)

	return out0, err

}

// OPCOMMANDSIGN is a free data retrieval call binding the contract method 0x56c4e670.
//
// Solidity: function OP_COMMAND_SIGN() view returns(bytes32)
func (_InstructionSender *InstructionSenderSession) OPCOMMANDSIGN() ([32]byte, error) {
	return _InstructionSender.Contract.OPCOMMANDSIGN(&_InstructionSender.CallOpts)
}

// OPCOMMANDSIGN is a free data retrieval call binding the contract method 0x56c4e670.
//
// Solidity: function OP_COMMAND_SIGN() view returns(bytes32)
func (_InstructionSender *InstructionSenderCallerSession) OPCOMMANDSIGN() ([32]byte, error) {
	return _InstructionSender.Contract.OPCOMMANDSIGN(&_InstructionSender.CallOpts)
}

// OPCOMMANDUPDATE is a free data retrieval call binding the contract method 0x20fc9407.
//
// Solidity: function OP_COMMAND_UPDATE() view returns(bytes32)
func (_InstructionSender *InstructionSenderCaller) OPCOMMANDUPDATE(opts *bind.CallOpts) ([32]byte, error) {
	var out []interface{}
	err := _InstructionSender.contract.Call(opts, &out, "OP_COMMAND_UPDATE")

	if err != nil {
		return *new([32]byte), err
	}

	out0 := *abi.ConvertType(out[0], new([32]byte)).(*[32]byte)

	return out0, err

}

// OPCOMMANDUPDATE is a free data retrieval call binding the contract method 0x20fc9407.
//
// Solidity: function OP_COMMAND_UPDATE() view returns(bytes32)
func (_InstructionSender *InstructionSenderSession) OPCOMMANDUPDATE() ([32]byte, error) {
	return _InstructionSender.Contract.OPCOMMANDUPDATE(&_InstructionSender.CallOpts)
}

// OPCOMMANDUPDATE is a free data retrieval call binding the contract method 0x20fc9407.
//
// Solidity: function OP_COMMAND_UPDATE() view returns(bytes32)
func (_InstructionSender *InstructionSenderCallerSession) OPCOMMANDUPDATE() ([32]byte, error) {
	return _InstructionSender.Contract.OPCOMMANDUPDATE(&_InstructionSender.CallOpts)
}

// OPTYPEKEY is a free data retrieval call binding the contract method 0xc5028bbb.
//
// Solidity: function OP_TYPE_KEY() view returns(bytes32)
func (_InstructionSender *InstructionSenderCaller) OPTYPEKEY(opts *bind.CallOpts) ([32]byte, error) {
	var out []interface{}
	err := _InstructionSender.contract.Call(opts, &out, "OP_TYPE_KEY")

	if err != nil {
		return *new([32]byte), err
	}

	out0 := *abi.ConvertType(out[0], new([32]byte)).(*[32]byte)

	return out0, err

}

// OPTYPEKEY is a free data retrieval call binding the contract method 0xc5028bbb.
//
// Solidity: function OP_TYPE_KEY() view returns(bytes32)
func (_InstructionSender *InstructionSenderSession) OPTYPEKEY() ([32]byte, error) {
	return _InstructionSender.Contract.OPTYPEKEY(&_InstructionSender.CallOpts)
}

// OPTYPEKEY is a free data retrieval call binding the contract method 0xc5028bbb.
//
// Solidity: function OP_TYPE_KEY() view returns(bytes32)
func (_InstructionSender *InstructionSenderCallerSession) OPTYPEKEY() ([32]byte, error) {
	return _InstructionSender.Contract.OPTYPEKEY(&_InstructionSender.CallOpts)
}

// TEEEXTENSIONREGISTRY is a free data retrieval call binding the contract method 0x34759513.
//
// Solidity: function TEE_EXTENSION_REGISTRY() view returns(address)
func (_InstructionSender *InstructionSenderCaller) TEEEXTENSIONREGISTRY(opts *bind.CallOpts) (common.Address, error) {
	var out []interface{}
	err := _InstructionSender.contract.Call(opts, &out, "TEE_EXTENSION_REGISTRY")

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// TEEEXTENSIONREGISTRY is a free data retrieval call binding the contract method 0x34759513.
//
// Solidity: function TEE_EXTENSION_REGISTRY() view returns(address)
func (_InstructionSender *InstructionSenderSession) TEEEXTENSIONREGISTRY() (common.Address, error) {
	return _InstructionSender.Contract.TEEEXTENSIONREGISTRY(&_InstructionSender.CallOpts)
}

// TEEEXTENSIONREGISTRY is a free data retrieval call binding the contract method 0x34759513.
//
// Solidity: function TEE_EXTENSION_REGISTRY() view returns(address)
func (_InstructionSender *InstructionSenderCallerSession) TEEEXTENSIONREGISTRY() (common.Address, error) {
	return _InstructionSender.Contract.TEEEXTENSIONREGISTRY(&_InstructionSender.CallOpts)
}

// TEEMACHINEREGISTRY is a free data retrieval call binding the contract method 0xd77798a9.
//
// Solidity: function TEE_MACHINE_REGISTRY() view returns(address)
func (_InstructionSender *InstructionSenderCaller) TEEMACHINEREGISTRY(opts *bind.CallOpts) (common.Address, error) {
	var out []interface{}
	err := _InstructionSender.contract.Call(opts, &out, "TEE_MACHINE_REGISTRY")

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// TEEMACHINEREGISTRY is a free data retrieval call binding the contract method 0xd77798a9.
//
// Solidity: function TEE_MACHINE_REGISTRY() view returns(address)
func (_InstructionSender *InstructionSenderSession) TEEMACHINEREGISTRY() (common.Address, error) {
	return _InstructionSender.Contract.TEEMACHINEREGISTRY(&_InstructionSender.CallOpts)
}

// TEEMACHINEREGISTRY is a free data retrieval call binding the contract method 0xd77798a9.
//
// Solidity: function TEE_MACHINE_REGISTRY() view returns(address)
func (_InstructionSender *InstructionSenderCallerSession) TEEMACHINEREGISTRY() (common.Address, error) {
	return _InstructionSender.Contract.TEEMACHINEREGISTRY(&_InstructionSender.CallOpts)
}

// ExtensionId is a free data retrieval call binding the contract method 0xd473e270.
//
// Solidity: function _extensionId() view returns(uint256)
func (_InstructionSender *InstructionSenderCaller) ExtensionId(opts *bind.CallOpts) (*big.Int, error) {
	var out []interface{}
	err := _InstructionSender.contract.Call(opts, &out, "_extensionId")

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// ExtensionId is a free data retrieval call binding the contract method 0xd473e270.
//
// Solidity: function _extensionId() view returns(uint256)
func (_InstructionSender *InstructionSenderSession) ExtensionId() (*big.Int, error) {
	return _InstructionSender.Contract.ExtensionId(&_InstructionSender.CallOpts)
}

// ExtensionId is a free data retrieval call binding the contract method 0xd473e270.
//
// Solidity: function _extensionId() view returns(uint256)
func (_InstructionSender *InstructionSenderCallerSession) ExtensionId() (*big.Int, error) {
	return _InstructionSender.Contract.ExtensionId(&_InstructionSender.CallOpts)
}

// SetExtensionId is a paid mutator transaction binding the contract method 0xaa5032c6.
//
// Solidity: function setExtensionId() returns()
func (_InstructionSender *InstructionSenderTransactor) SetExtensionId(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _InstructionSender.contract.Transact(opts, "setExtensionId")
}

// SetExtensionId is a paid mutator transaction binding the contract method 0xaa5032c6.
//
// Solidity: function setExtensionId() returns()
func (_InstructionSender *InstructionSenderSession) SetExtensionId() (*types.Transaction, error) {
	return _InstructionSender.Contract.SetExtensionId(&_InstructionSender.TransactOpts)
}

// SetExtensionId is a paid mutator transaction binding the contract method 0xaa5032c6.
//
// Solidity: function setExtensionId() returns()
func (_InstructionSender *InstructionSenderTransactorSession) SetExtensionId() (*types.Transaction, error) {
	return _InstructionSender.Contract.SetExtensionId(&_InstructionSender.TransactOpts)
}

// SetPolicy is a paid mutator transaction binding the contract method 0xd8253428.
//
// Solidity: function setPolicy(bytes _policy) payable returns()
func (_InstructionSender *InstructionSenderTransactor) SetPolicy(opts *bind.TransactOpts, _policy []byte) (*types.Transaction, error) {
	return _InstructionSender.contract.Transact(opts, "setPolicy", _policy)
}

// SetPolicy is a paid mutator transaction binding the contract method 0xd8253428.
//
// Solidity: function setPolicy(bytes _policy) payable returns()
func (_InstructionSender *InstructionSenderSession) SetPolicy(_policy []byte) (*types.Transaction, error) {
	return _InstructionSender.Contract.SetPolicy(&_InstructionSender.TransactOpts, _policy)
}

// SetPolicy is a paid mutator transaction binding the contract method 0xd8253428.
//
// Solidity: function setPolicy(bytes _policy) payable returns()
func (_InstructionSender *InstructionSenderTransactorSession) SetPolicy(_policy []byte) (*types.Transaction, error) {
	return _InstructionSender.Contract.SetPolicy(&_InstructionSender.TransactOpts, _policy)
}

// Sign is a paid mutator transaction binding the contract method 0x76cd7cbc.
//
// Solidity: function sign(bytes _message) payable returns()
func (_InstructionSender *InstructionSenderTransactor) Sign(opts *bind.TransactOpts, _message []byte) (*types.Transaction, error) {
	return _InstructionSender.contract.Transact(opts, "sign", _message)
}

// Sign is a paid mutator transaction binding the contract method 0x76cd7cbc.
//
// Solidity: function sign(bytes _message) payable returns()
func (_InstructionSender *InstructionSenderSession) Sign(_message []byte) (*types.Transaction, error) {
	return _InstructionSender.Contract.Sign(&_InstructionSender.TransactOpts, _message)
}

// Sign is a paid mutator transaction binding the contract method 0x76cd7cbc.
//
// Solidity: function sign(bytes _message) payable returns()
func (_InstructionSender *InstructionSenderTransactorSession) Sign(_message []byte) (*types.Transaction, error) {
	return _InstructionSender.Contract.Sign(&_InstructionSender.TransactOpts, _message)
}

// UpdateKey is a paid mutator transaction binding the contract method 0xe6eb6867.
//
// Solidity: function updateKey(bytes _encryptedKey) payable returns()
func (_InstructionSender *InstructionSenderTransactor) UpdateKey(opts *bind.TransactOpts, _encryptedKey []byte) (*types.Transaction, error) {
	return _InstructionSender.contract.Transact(opts, "updateKey", _encryptedKey)
}

// UpdateKey is a paid mutator transaction binding the contract method 0xe6eb6867.
//
// Solidity: function updateKey(bytes _encryptedKey) payable returns()
func (_InstructionSender *InstructionSenderSession) UpdateKey(_encryptedKey []byte) (*types.Transaction, error) {
	return _InstructionSender.Contract.UpdateKey(&_InstructionSender.TransactOpts, _encryptedKey)
}

// UpdateKey is a paid mutator transaction binding the contract method 0xe6eb6867.
//
// Solidity: function updateKey(bytes _encryptedKey) payable returns()
func (_InstructionSender *InstructionSenderTransactorSession) UpdateKey(_encryptedKey []byte) (*types.Transaction, error) {
	return _InstructionSender.Contract.UpdateKey(&_InstructionSender.TransactOpts, _encryptedKey)
}

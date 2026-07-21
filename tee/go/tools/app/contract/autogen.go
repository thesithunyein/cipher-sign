// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package contract

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
	ABI: "[{\"type\":\"constructor\",\"inputs\":[{\"name\":\"_teeExtensionRegistry\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"_teeMachineRegistry\",\"type\":\"address\",\"internalType\":\"address\"}],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"_extensionId\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"setExtensionId\",\"inputs\":[],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"setPolicy\",\"inputs\":[{\"name\":\"_policy\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"stateMutability\":\"payable\"},{\"type\":\"function\",\"name\":\"sign\",\"inputs\":[{\"name\":\"_message\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"stateMutability\":\"payable\"},{\"type\":\"function\",\"name\":\"teeExtensionRegistry\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"address\",\"internalType\":\"contractITeeExtensionRegistry\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"teeMachineRegistry\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"address\",\"internalType\":\"contractITeeMachineRegistry\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"updateKey\",\"inputs\":[{\"name\":\"_encryptedKey\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"stateMutability\":\"payable\"}]",
	Bin: "0x60c060405234801562000010575f80fd5b50604051620015f6380380620015f683398181016040528101906200003691906200010b565b8173ffffffffffffffffffffffffffffffffffffffff1660808173ffffffffffffffffffffffffffffffffffffffff16815250508073ffffffffffffffffffffffffffffffffffffffff1660a08173ffffffffffffffffffffffffffffffffffffffff1681525050505062000150565b5f80fd5b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f620000d582620000aa565b9050919050565b620000e781620000c9565b8114620000f2575f80fd5b50565b5f815190506200010581620000dc565b92915050565b5f8060408385031215620001245762000123620000a6565b5b5f6200013385828601620000f5565b92505060206200014685828601620000f5565b9150509250929050565b60805160a05161144c620001aa5f395f81816101990152818161020201528181610667015261089b01525f818161034a015281816103f1015281816104590152818161050c015281816107af01526109e3015261144c5ff3fe60806040526004361061006f575f3560e01c8063aa5032c61161004d578063aa5032c6146100f7578063d473e2701461010d578063d825342814610137578063e6eb6867146101675761006f565b8063524967d71461007357806376cd7cbc1461009d578063a435d58a146100cd575b5f80fd5b34801561007e575f80fd5b50610087610197565b6040516100949190610b5a565b60405180910390f35b6100b760048036038101906100b29190610be5565b6101bb565b6040516100c49190610c48565b60405180910390f35b3480156100d8575f80fd5b506100e16103ef565b6040516100ee9190610c81565b60405180910390f35b348015610102575f80fd5b5061010b610413565b005b348015610118575f80fd5b5061012161061b565b60405161012e9190610cb2565b60405180910390f35b610151600480360381019061014c9190610be5565b610620565b60405161015e9190610c48565b60405180910390f35b610181600480360381019061017c9190610be5565b610854565b60405161018e9190610c48565b60405180910390f35b7f000000000000000000000000000000000000000000000000000000000000000081565b5f805f54036101ff576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016101f690610d25565b60405180910390fd5b5f7f000000000000000000000000000000000000000000000000000000000000000073ffffffffffffffffffffffffffffffffffffffff1663feeabcbf5f5460016040518363ffffffff1660e01b815260040161025d929190610d7c565b5f60405180830381865afa158015610277573d5f803e3d5ffd5b505050506040513d5f823e3d601f19601f8201168201806040525081019061029f9190610f26565b90506102a9610a88565b7f4b45590000000000000000000000000000000000000000000000000000000000815f0181815250507f5349474e0000000000000000000000000000000000000000000000000000000081602001818152505084848080601f0160208091040260200160405190810160405280939291908181526020018383808284375f81840152601f19601f8201169050808301925050505050505081604001819052507f000000000000000000000000000000000000000000000000000000000000000073ffffffffffffffffffffffffffffffffffffffff1663f731df533484846040518463ffffffff1660e01b81526004016103a49291906111c8565b60206040518083038185885af11580156103c0573d5f803e3d5ffd5b50505050506040513d601f19601f820116820180604052508101906103e59190611227565b9250505092915050565b7f000000000000000000000000000000000000000000000000000000000000000081565b5f805414610456576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161044d9061129c565b60405180910390fd5b5f7f000000000000000000000000000000000000000000000000000000000000000073ffffffffffffffffffffffffffffffffffffffff1663fad5902b6040518163ffffffff1660e01b8152600401602060405180830381865afa1580156104c0573d5f803e3d5ffd5b505050506040513d601f19601f820116820180604052508101906104e491906112e4565b90505f600190505b8181116105dd573073ffffffffffffffffffffffffffffffffffffffff167f000000000000000000000000000000000000000000000000000000000000000073ffffffffffffffffffffffffffffffffffffffff16632c177358836040518263ffffffff1660e01b81526004016105639190610cb2565b602060405180830381865afa15801561057e573d5f803e3d5ffd5b505050506040513d601f19601f820116820180604052508101906105a2919061130f565b73ffffffffffffffffffffffffffffffffffffffff16036105ca57805f819055505050610619565b80806105d590611367565b9150506104ec565b506040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610610906113f8565b60405180910390fd5b565b5f5481565b5f805f5403610664576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161065b90610d25565b60405180910390fd5b5f7f000000000000000000000000000000000000000000000000000000000000000073ffffffffffffffffffffffffffffffffffffffff1663feeabcbf5f5460016040518363ffffffff1660e01b81526004016106c2929190610d7c565b5f60405180830381865afa1580156106dc573d5f803e3d5ffd5b505050506040513d5f823e3d601f19601f820116820180604052508101906107049190610f26565b905061070e610a88565b7f4b45590000000000000000000000000000000000000000000000000000000000815f0181815250507f5345545f504f4c4943590000000000000000000000000000000000000000000081602001818152505084848080601f0160208091040260200160405190810160405280939291908181526020018383808284375f81840152601f19601f8201169050808301925050505050505081604001819052507f000000000000000000000000000000000000000000000000000000000000000073ffffffffffffffffffffffffffffffffffffffff1663f731df533484846040518463ffffffff1660e01b81526004016108099291906111c8565b60206040518083038185885af1158015610825573d5f803e3d5ffd5b50505050506040513d601f19601f8201168201806040525081019061084a9190611227565b9250505092915050565b5f805f5403610898576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161088f90610d25565b60405180910390fd5b5f7f000000000000000000000000000000000000000000000000000000000000000073ffffffffffffffffffffffffffffffffffffffff1663feeabcbf5f5460016040518363ffffffff1660e01b81526004016108f6929190610d7c565b5f60405180830381865afa158015610910573d5f803e3d5ffd5b505050506040513d5f823e3d601f19601f820116820180604052508101906109389190610f26565b9050610942610a88565b7f4b45590000000000000000000000000000000000000000000000000000000000815f0181815250507f555044415445000000000000000000000000000000000000000000000000000081602001818152505084848080601f0160208091040260200160405190810160405280939291908181526020018383808284375f81840152601f19601f8201169050808301925050505050505081604001819052507f000000000000000000000000000000000000000000000000000000000000000073ffffffffffffffffffffffffffffffffffffffff1663f731df533484846040518463ffffffff1660e01b8152600401610a3d9291906111c8565b60206040518083038185885af1158015610a59573d5f803e3d5ffd5b50505050506040513d601f19601f82011682018060405250810190610a7e9190611227565b9250505092915050565b6040518060c001604052805f80191681526020015f801916815260200160608152602001606081526020015f67ffffffffffffffff1681526020015f73ffffffffffffffffffffffffffffffffffffffff1681525090565b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f819050919050565b5f610b22610b1d610b1884610ae0565b610aff565b610ae0565b9050919050565b5f610b3382610b08565b9050919050565b5f610b4482610b29565b9050919050565b610b5481610b3a565b82525050565b5f602082019050610b6d5f830184610b4b565b92915050565b5f604051905090565b5f80fd5b5f80fd5b5f80fd5b5f80fd5b5f80fd5b5f8083601f840112610ba557610ba4610b84565b5b8235905067ffffffffffffffff811115610bc257610bc1610b88565b5b602083019150836001820283011115610bde57610bdd610b8c565b5b9250929050565b5f8060208385031215610bfb57610bfa610b7c565b5b5f83013567ffffffffffffffff811115610c1857610c17610b80565b5b610c2485828601610b90565b92509250509250929050565b5f819050919050565b610c4281610c30565b82525050565b5f602082019050610c5b5f830184610c39565b92915050565b5f610c6b82610b29565b9050919050565b610c7b81610c61565b82525050565b5f602082019050610c945f830184610c72565b92915050565b5f819050919050565b610cac81610c9a565b82525050565b5f602082019050610cc55f830184610ca3565b92915050565b5f82825260208201905092915050565b7f657874656e73696f6e204944206e6f74207365740000000000000000000000005f82015250565b5f610d0f601483610ccb565b9150610d1a82610cdb565b602082019050919050565b5f6020820190508181035f830152610d3c81610d03565b9050919050565b5f819050919050565b5f610d66610d61610d5c84610d43565b610aff565b610c9a565b9050919050565b610d7681610d4c565b82525050565b5f604082019050610d8f5f830185610ca3565b610d9c6020830184610d6d565b9392505050565b5f601f19601f8301169050919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52604160045260245ffd5b610de982610da3565b810181811067ffffffffffffffff82111715610e0857610e07610db3565b5b80604052505050565b5f610e1a610b73565b9050610e268282610de0565b919050565b5f67ffffffffffffffff821115610e4557610e44610db3565b5b602082029050602081019050919050565b5f610e6082610ae0565b9050919050565b610e7081610e56565b8114610e7a575f80fd5b50565b5f81519050610e8b81610e67565b92915050565b5f610ea3610e9e84610e2b565b610e11565b90508083825260208201905060208402830185811115610ec657610ec5610b8c565b5b835b81811015610eef5780610edb8882610e7d565b845260208401935050602081019050610ec8565b5050509392505050565b5f82601f830112610f0d57610f0c610b84565b5b8151610f1d848260208601610e91565b91505092915050565b5f60208284031215610f3b57610f3a610b7c565b5b5f82015167ffffffffffffffff811115610f5857610f57610b80565b5b610f6484828501610ef9565b91505092915050565b5f81519050919050565b5f82825260208201905092915050565b5f819050602082019050919050565b610f9f81610e56565b82525050565b5f610fb08383610f96565b60208301905092915050565b5f602082019050919050565b5f610fd282610f6d565b610fdc8185610f77565b9350610fe783610f87565b805f5b83811015611017578151610ffe8882610fa5565b975061100983610fbc565b925050600181019050610fea565b5085935050505092915050565b61102d81610c30565b82525050565b5f81519050919050565b5f82825260208201905092915050565b5f5b8381101561106a57808201518184015260208101905061104f565b5f8484015250505050565b5f61107f82611033565b611089818561103d565b935061109981856020860161104d565b6110a281610da3565b840191505092915050565b5f82825260208201905092915050565b5f6110c782610f6d565b6110d181856110ad565b93506110dc83610f87565b805f5b8381101561110c5781516110f38882610fa5565b97506110fe83610fbc565b9250506001810190506110df565b5085935050505092915050565b5f67ffffffffffffffff82169050919050565b61113581611119565b82525050565b5f60c083015f8301516111505f860182611024565b5060208301516111636020860182611024565b506040830151848203604086015261117b8282611075565b9150506060830151848203606086015261119582826110bd565b91505060808301516111aa608086018261112c565b5060a08301516111bd60a0860182610f96565b508091505092915050565b5f6040820190508181035f8301526111e08185610fc8565b905081810360208301526111f4818461113b565b90509392505050565b61120681610c30565b8114611210575f80fd5b50565b5f81519050611221816111fd565b92915050565b5f6020828403121561123c5761123b610b7c565b5b5f61124984828501611213565b91505092915050565b7f657874656e73696f6e20494420616c72656164792073657400000000000000005f82015250565b5f611286601883610ccb565b915061129182611252565b602082019050919050565b5f6020820190508181035f8301526112b38161127a565b9050919050565b6112c381610c9a565b81146112cd575f80fd5b50565b5f815190506112de816112ba565b92915050565b5f602082840312156112f9576112f8610b7c565b5b5f611306848285016112d0565b91505092915050565b5f6020828403121561132457611323610b7c565b5b5f61133184828501610e7d565b91505092915050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f61137182610c9a565b91507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff82036113a3576113a261133a565b5b600182019050919050565b7f657874656e73696f6e204944206e6f7420666f756e64000000000000000000005f82015250565b5f6113e2601683610ccb565b91506113ed826113ae565b602082019050919050565b5f6020820190508181035f83015261140f816113d6565b905091905056fea2646970667358221220a47260db788d8750ce45e7aab752120ffab5274edbb09e058ef512e771b5e3af64736f6c63430008180033",
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

// TeeExtensionRegistry is a free data retrieval call binding the contract method 0xa435d58a.
//
// Solidity: function teeExtensionRegistry() view returns(address)
func (_InstructionSender *InstructionSenderCaller) TeeExtensionRegistry(opts *bind.CallOpts) (common.Address, error) {
	var out []interface{}
	err := _InstructionSender.contract.Call(opts, &out, "teeExtensionRegistry")

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// TeeExtensionRegistry is a free data retrieval call binding the contract method 0xa435d58a.
//
// Solidity: function teeExtensionRegistry() view returns(address)
func (_InstructionSender *InstructionSenderSession) TeeExtensionRegistry() (common.Address, error) {
	return _InstructionSender.Contract.TeeExtensionRegistry(&_InstructionSender.CallOpts)
}

// TeeExtensionRegistry is a free data retrieval call binding the contract method 0xa435d58a.
//
// Solidity: function teeExtensionRegistry() view returns(address)
func (_InstructionSender *InstructionSenderCallerSession) TeeExtensionRegistry() (common.Address, error) {
	return _InstructionSender.Contract.TeeExtensionRegistry(&_InstructionSender.CallOpts)
}

// TeeMachineRegistry is a free data retrieval call binding the contract method 0x524967d7.
//
// Solidity: function teeMachineRegistry() view returns(address)
func (_InstructionSender *InstructionSenderCaller) TeeMachineRegistry(opts *bind.CallOpts) (common.Address, error) {
	var out []interface{}
	err := _InstructionSender.contract.Call(opts, &out, "teeMachineRegistry")

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// TeeMachineRegistry is a free data retrieval call binding the contract method 0x524967d7.
//
// Solidity: function teeMachineRegistry() view returns(address)
func (_InstructionSender *InstructionSenderSession) TeeMachineRegistry() (common.Address, error) {
	return _InstructionSender.Contract.TeeMachineRegistry(&_InstructionSender.CallOpts)
}

// TeeMachineRegistry is a free data retrieval call binding the contract method 0x524967d7.
//
// Solidity: function teeMachineRegistry() view returns(address)
func (_InstructionSender *InstructionSenderCallerSession) TeeMachineRegistry() (common.Address, error) {
	return _InstructionSender.Contract.TeeMachineRegistry(&_InstructionSender.CallOpts)
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
// Solidity: function setPolicy(bytes _policy) payable returns(bytes32)
func (_InstructionSender *InstructionSenderTransactor) SetPolicy(opts *bind.TransactOpts, _policy []byte) (*types.Transaction, error) {
	return _InstructionSender.contract.Transact(opts, "setPolicy", _policy)
}

// SetPolicy is a paid mutator transaction binding the contract method 0xd8253428.
//
// Solidity: function setPolicy(bytes _policy) payable returns(bytes32)
func (_InstructionSender *InstructionSenderSession) SetPolicy(_policy []byte) (*types.Transaction, error) {
	return _InstructionSender.Contract.SetPolicy(&_InstructionSender.TransactOpts, _policy)
}

// SetPolicy is a paid mutator transaction binding the contract method 0xd8253428.
//
// Solidity: function setPolicy(bytes _policy) payable returns(bytes32)
func (_InstructionSender *InstructionSenderTransactorSession) SetPolicy(_policy []byte) (*types.Transaction, error) {
	return _InstructionSender.Contract.SetPolicy(&_InstructionSender.TransactOpts, _policy)
}

// Sign is a paid mutator transaction binding the contract method 0x76cd7cbc.
//
// Solidity: function sign(bytes _message) payable returns(bytes32)
func (_InstructionSender *InstructionSenderTransactor) Sign(opts *bind.TransactOpts, _message []byte) (*types.Transaction, error) {
	return _InstructionSender.contract.Transact(opts, "sign", _message)
}

// Sign is a paid mutator transaction binding the contract method 0x76cd7cbc.
//
// Solidity: function sign(bytes _message) payable returns(bytes32)
func (_InstructionSender *InstructionSenderSession) Sign(_message []byte) (*types.Transaction, error) {
	return _InstructionSender.Contract.Sign(&_InstructionSender.TransactOpts, _message)
}

// Sign is a paid mutator transaction binding the contract method 0x76cd7cbc.
//
// Solidity: function sign(bytes _message) payable returns(bytes32)
func (_InstructionSender *InstructionSenderTransactorSession) Sign(_message []byte) (*types.Transaction, error) {
	return _InstructionSender.Contract.Sign(&_InstructionSender.TransactOpts, _message)
}

// UpdateKey is a paid mutator transaction binding the contract method 0xe6eb6867.
//
// Solidity: function updateKey(bytes _encryptedKey) payable returns(bytes32)
func (_InstructionSender *InstructionSenderTransactor) UpdateKey(opts *bind.TransactOpts, _encryptedKey []byte) (*types.Transaction, error) {
	return _InstructionSender.contract.Transact(opts, "updateKey", _encryptedKey)
}

// UpdateKey is a paid mutator transaction binding the contract method 0xe6eb6867.
//
// Solidity: function updateKey(bytes _encryptedKey) payable returns(bytes32)
func (_InstructionSender *InstructionSenderSession) UpdateKey(_encryptedKey []byte) (*types.Transaction, error) {
	return _InstructionSender.Contract.UpdateKey(&_InstructionSender.TransactOpts, _encryptedKey)
}

// UpdateKey is a paid mutator transaction binding the contract method 0xe6eb6867.
//
// Solidity: function updateKey(bytes _encryptedKey) payable returns(bytes32)
func (_InstructionSender *InstructionSenderTransactorSession) UpdateKey(_encryptedKey []byte) (*types.Transaction, error) {
	return _InstructionSender.Contract.UpdateKey(&_InstructionSender.TransactOpts, _encryptedKey)
}

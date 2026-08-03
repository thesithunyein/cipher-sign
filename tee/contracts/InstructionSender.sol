// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import { ITeeExtensionRegistry } from "./interfaces/ITeeExtensionRegistry.sol";
import { ITeeMachineRegistry } from "./interfaces/ITeeMachineRegistry.sol";

/// @title CipherSign InstructionSender
/// @notice On-chain entry for Flare FCC: load key, set policy, request gated signatures.
/// @dev Wired to the current FlareTeeManager diamond (both registry args = diamond).
contract InstructionSender {
    bytes32 public constant OP_TYPE_KEY = bytes32("KEY");
    bytes32 public constant OP_COMMAND_UPDATE = bytes32("UPDATE");
    bytes32 public constant OP_COMMAND_SET_POLICY = bytes32("SET_POLICY");
    bytes32 public constant OP_COMMAND_SIGN = bytes32("SIGN");

    ITeeExtensionRegistry public immutable TEE_EXTENSION_REGISTRY;
    ITeeMachineRegistry public immutable TEE_MACHINE_REGISTRY;

    uint256 private constant FIRST_PUBLIC_EXTENSION_ID = 0x10000; // 65536

    /// @notice Cached extension id (0 until setExtensionId succeeds).
    uint256 public _extensionId;

    constructor(
        ITeeExtensionRegistry _teeExtensionRegistry,
        ITeeMachineRegistry _teeMachineRegistry
    ) {
        require(address(_teeExtensionRegistry) != address(0), "TeeExtensionRegistry cannot be zero address");
        require(address(_teeMachineRegistry) != address(0), "TeeMachineRegistry cannot be zero address");
        require(address(_teeExtensionRegistry).code.length > 0, "TeeExtensionRegistry has no code");
        require(address(_teeMachineRegistry).code.length > 0, "TeeMachineRegistry has no code");
        TEE_EXTENSION_REGISTRY = _teeExtensionRegistry;
        TEE_MACHINE_REGISTRY = _teeMachineRegistry;
    }

    /// @notice Finds and sets this contract's extension id. Can only be set once.
    function setExtensionId() external {
        require(_extensionId == 0, "Extension ID already set.");

        uint256 c = TEE_EXTENSION_REGISTRY.nextPublicExtensionId();
        for (uint256 i = FIRST_PUBLIC_EXTENSION_ID; i < c; ++i) {
            if (TEE_EXTENSION_REGISTRY.getTeeExtensionInstructionsSender(i) == address(this)) {
                _extensionId = i;
                return;
            }
        }
        revert("Extension ID not found.");
    }

    function updateKey(bytes calldata _encryptedKey) external payable {
        _send(OP_COMMAND_UPDATE, _encryptedKey);
    }

    /// @notice Set signing policy inside the TEE (allowlist, maxAmount, expiresAt).
    function setPolicy(bytes calldata _policy) external payable {
        _send(OP_COMMAND_SET_POLICY, _policy);
    }

    function sign(bytes calldata _message) external payable {
        _send(OP_COMMAND_SIGN, _message);
    }

    function _send(bytes32 command, bytes calldata message) internal {
        address[] memory teeIds = TEE_MACHINE_REGISTRY.getRandomTeeIds(_requireExtensionId(), 1);
        address[] memory cosigners = new address[](0);

        ITeeExtensionRegistry.TeeInstructionParams memory params = ITeeExtensionRegistry.TeeInstructionParams({
            opType: OP_TYPE_KEY,
            opCommand: command,
            message: message,
            cosigners: cosigners,
            cosignersThreshold: 0,
            claimBackAddress: msg.sender
        });

        TEE_EXTENSION_REGISTRY.sendInstructions{value: msg.value}(teeIds, params);
    }

    function _requireExtensionId() internal view returns (uint256) {
        require(_extensionId != 0, "Extension ID is not set.");
        return _extensionId;
    }
}

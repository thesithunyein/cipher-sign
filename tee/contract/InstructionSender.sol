// SPDX-License-Identifier: MIT
pragma solidity >=0.7.6 <0.9;

import { ITeeExtensionRegistry } from "./interface/ITeeExtensionRegistry.sol";
import { ITeeMachineRegistry } from "./interface/ITeeMachineRegistry.sol";

/// @title CipherSign InstructionSender
/// @notice On-chain entry for Flare FCC: load key, set policy, request gated signatures.
contract InstructionSender {
    ITeeExtensionRegistry public immutable teeExtensionRegistry;
    ITeeMachineRegistry public immutable teeMachineRegistry;

    uint256 public _extensionId;

    constructor(
        address _teeExtensionRegistry,
        address _teeMachineRegistry
    ) {
        teeExtensionRegistry = ITeeExtensionRegistry(_teeExtensionRegistry);
        teeMachineRegistry = ITeeMachineRegistry(_teeMachineRegistry);
    }

    /// @notice Bind this sender to a known extension id (cheap — one registry read).
    /// @dev Prefer this over the scan helper once EXTENSION_ID is known from pre-build.
    function setExtensionId(uint256 id) external {
        require(_extensionId == 0, "extension ID already set");
        require(id != 0, "bad id");
        require(
            teeExtensionRegistry.getTeeExtensionInstructionsSender(id) ==
                address(this),
            "extension ID not found"
        );
        _extensionId = id;
    }

    /// @notice Discover extension ID by scanning the registry (expensive on busy networks).
    function discoverExtensionId() external {
        require(_extensionId == 0, "extension ID already set");

        uint256 count = teeExtensionRegistry.extensionsCounter();
        for (uint256 i = 1; i <= count; i++) {
            if (
                teeExtensionRegistry.getTeeExtensionInstructionsSender(i) ==
                address(this)
            ) {
                _extensionId = i;
                return;
            }
        }
        revert("extension ID not found");
    }

    /// @notice Update the stored private key by sending an encrypted key to the TEE.
    function updateKey(bytes calldata _encryptedKey) external payable returns (bytes32) {
        require(_extensionId != 0, "extension ID not set");

        address[] memory teeIds = teeMachineRegistry.getRandomTeeIds(_extensionId, 1);

        ITeeExtensionRegistry.TeeInstructionParams memory params;
        params.opType = bytes32("KEY");
        params.opCommand = bytes32("UPDATE");
        params.message = _encryptedKey;

        return teeExtensionRegistry.sendInstructions{value: msg.value}(teeIds, params);
    }

    /// @notice Set signing policy inside the TEE (allowlist, maxAmount, expiresAt).
    function setPolicy(bytes calldata _policy) external payable returns (bytes32) {
        require(_extensionId != 0, "extension ID not set");

        address[] memory teeIds = teeMachineRegistry.getRandomTeeIds(_extensionId, 1);

        ITeeExtensionRegistry.TeeInstructionParams memory params;
        params.opType = bytes32("KEY");
        params.opCommand = bytes32("SET_POLICY");
        params.message = _policy;

        return teeExtensionRegistry.sendInstructions{value: msg.value}(teeIds, params);
    }

    /// @notice Request the TEE to sign an intent if policy allows.
    function sign(bytes calldata _message) external payable returns (bytes32) {
        require(_extensionId != 0, "extension ID not set");

        address[] memory teeIds = teeMachineRegistry.getRandomTeeIds(_extensionId, 1);

        ITeeExtensionRegistry.TeeInstructionParams memory params;
        params.opType = bytes32("KEY");
        params.opCommand = bytes32("SIGN");
        params.message = _message;

        return teeExtensionRegistry.sendInstructions{value: msg.value}(teeIds, params);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title VelocityToken (VELO)
 * @notice Production-grade ERC-20 token with configurable transfer fees
 *         (treasury, burn and liquidity), a max-wallet limit and
 *         per-account fee exemptions.
 * @dev All fee values are expressed in basis points (1 bps = 0.01%).
 *      The ABI of this contract is a faithful reconstruction of the
 *      compiled artifact that shipped in the original repository
 *      (`VelocityToken.json`, solc 0.8.20).
 */
contract VelocityToken is ERC20, Ownable {
    /// @dev Hard cap on the sum of all fees (10%).
    uint256 private constant MAX_TOTAL_FEE = 1_000;
    /// @dev Basis-point denominator.
    uint256 private constant FEE_DENOMINATOR = 10_000;
    /// @dev Initial supply minted to the deployer (10,000,000 tokens).
    uint256 private constant INITIAL_SUPPLY = 10_000_000;

    /// @notice Address that receives the treasury portion of transfer fees.
    address public treasuryWallet;
    /// @notice Treasury fee in basis points.
    uint256 public treasuryFee;
    /// @notice Burn fee in basis points.
    uint256 public burnFee;
    /// @notice Liquidity fee in basis points (accumulated on the contract).
    uint256 public liquidityFee;
    /// @notice Maximum amount of tokens a non-exempt wallet may hold.
    ///         A value of 0 disables the limit.
    uint256 public maxWalletLimit;

    /// @notice Whether an account is exempt from transfer fees and the max-wallet limit.
    mapping(address => bool) public isFeeExempt;

    /**
     * @param _treasury Address that receives treasury fees. The deployer
     *                  becomes the contract owner.
     */
    constructor(address _treasury) ERC20("Velocity Token", "VELO") Ownable(msg.sender) {
        require(_treasury != address(0), "VelocityToken: treasury is the zero address");

        treasuryWallet = _treasury;

        // Default fee schedule: 2% treasury, 1% burn, 1% liquidity (4% total).
        treasuryFee = 200;
        burnFee = 100;
        liquidityFee = 100;

        uint256 initialSupply = INITIAL_SUPPLY * (10 ** decimals());

        // Default max wallet: 1% of the initial supply.
        maxWalletLimit = initialSupply / 100;

        // The owner, the treasury and the contract itself never pay fees.
        isFeeExempt[msg.sender] = true;
        isFeeExempt[_treasury] = true;
        isFeeExempt[address(this)] = true;

        _mint(msg.sender, initialSupply);
    }

    // ---------------------------------------------------------------------
    // Owner controls
    // ---------------------------------------------------------------------

    /**
     * @notice Update the transfer fee schedule.
     * @param _treasuryFee  New treasury fee in basis points.
     * @param _burnFee      New burn fee in basis points.
     * @param _liquidityFee New liquidity fee in basis points.
     */
    function setFees(
        uint256 _treasuryFee,
        uint256 _burnFee,
        uint256 _liquidityFee
    ) external onlyOwner {
        require(
            _treasuryFee + _burnFee + _liquidityFee <= MAX_TOTAL_FEE,
            "VelocityToken: total fee exceeds maximum"
        );
        treasuryFee = _treasuryFee;
        burnFee = _burnFee;
        liquidityFee = _liquidityFee;
    }

    /**
     * @notice Update the maximum amount a non-exempt wallet may hold.
     * @param _maxWalletLimit New limit in token wei. Use 0 to disable the limit.
     */
    function setMaxWallet(uint256 _maxWalletLimit) external onlyOwner {
        require(
            _maxWalletLimit == 0 || _maxWalletLimit >= totalSupply() / 1_000,
            "VelocityToken: limit too low"
        );
        maxWalletLimit = _maxWalletLimit;
    }

    /**
     * @notice Exempt or un-exempt an account from fees and the max-wallet limit.
     * @param account Account to update.
     * @param exempt  True to exempt, false to remove the exemption.
     */
    function setFeeExempt(address account, bool exempt) external onlyOwner {
        require(account != address(0), "VelocityToken: account is the zero address");
        isFeeExempt[account] = exempt;
    }

    // ---------------------------------------------------------------------
    // Transfer logic
    // ---------------------------------------------------------------------

    /**
     * @dev ERC-20 transfer hook that applies fees and enforces the max-wallet
     *      limit. Mints and burns bypass fees entirely.
     */
    function _update(address from, address to, uint256 value) internal override {
        // Minting or burning: no fees, no wallet-limit checks.
        if (from == address(0) || to == address(0)) {
            super._update(from, to, value);
            return;
        }

        uint256 feeAmount = _calculateFee(from, to, value);
        uint256 netAmount = value - feeAmount;

        if (maxWalletLimit > 0 && !isFeeExempt[to]) {
            require(
                balanceOf(to) + netAmount <= maxWalletLimit,
                "VelocityToken: max wallet exceeded"
            );
        }

        if (feeAmount > 0) {
            uint256 treasuryAmount = (value * treasuryFee) / FEE_DENOMINATOR;
            uint256 burnAmount = (value * burnFee) / FEE_DENOMINATOR;
            uint256 liquidityAmount = feeAmount - treasuryAmount - burnAmount;

            if (treasuryAmount > 0) {
                super._update(from, treasuryWallet, treasuryAmount);
            }
            if (liquidityAmount > 0) {
                super._update(from, address(this), liquidityAmount);
            }
            if (burnAmount > 0) {
                super._update(from, address(0), burnAmount);
            }
        }

        super._update(from, to, netAmount);
    }

    /// @dev Returns the total fee (in token wei) for a transfer, or 0 if exempt.
    function _calculateFee(address from, address to, uint256 value) private view returns (uint256) {
        if (isFeeExempt[from] || isFeeExempt[to]) {
            return 0;
        }
        uint256 totalFee = treasuryFee + burnFee + liquidityFee;
        if (totalFee == 0) {
            return 0;
        }
        return (value * totalFee) / FEE_DENOMINATOR;
    }
}

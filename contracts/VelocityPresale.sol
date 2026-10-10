// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title VelocityPresale
 * @notice Token presale / crowdsale with optional whitelist, soft & hard caps,
 *         per-wallet purchase limits and a post-sale claim mechanism.
 * @dev The ABI of this contract is a faithful reconstruction of the compiled
 *      artifact that shipped in the original repository
 *      (`VelocityPresale.json`, solc 0.8.20).
 */
contract VelocityPresale is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice A single buyer's aggregated purchase record.
    struct Purchase {
        uint256 paymentAmount;
        uint256 tokenAmount;
        uint256 timestamp;
        bool claimed;
    }

    /// @notice Token being sold.
    IERC20 public token;
    /// @notice Payment token. `address(0)` means the native currency (ETH).
    address public paymentToken;
    /// @notice Number of tokens (whole units) granted per 1 unit of payment currency.
    uint256 public presalePrice;
    /// @notice Unix timestamp when the presale opens.
    uint256 public startTime;
    /// @notice Unix timestamp when the presale closes.
    uint256 public endTime;
    /// @notice Maximum amount of payment currency to raise.
    uint256 public hardCap;
    /// @notice Minimum amount of payment currency to raise for a successful sale.
    uint256 public softCap;
    /// @notice Minimum contribution per buyer.
    uint256 public minPurchase;
    /// @notice Maximum cumulative contribution per buyer.
    uint256 public maxPurchase;

    /// @notice Total tokens sold so far.
    uint256 public tokensSold;
    /// @notice Total tokens claimed by buyers so far.
    uint256 private _tokensClaimed;
    /// @notice Total payment currency raised so far.
    uint256 public totalRaised;
    /// @notice Whether the owner has explicitly ended the presale.
    bool public presaleEnded;
    /// @notice Whether buyers may claim their tokens.
    bool public presaleClaimable;
    /// @notice Whether a whitelist is enforced.
    bool public whitelistRequired;

    /// @notice Whitelist membership.
    mapping(address => bool) public isWhitelisted;
    /// @notice Per-buyer purchase records.
    mapping(address => Purchase) public purchases;
    /// @notice Ordered list of unique buyers.
    address[] public purchasers;

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------

    event TokensPurchased(address indexed purchaser, uint256 paymentAmount, uint256 tokenAmount);
    event TokensClaimed(address indexed purchaser, uint256 tokenAmount);
    event PresaleEnded(uint256 totalRaised, uint256 tokensSold);
    event PresaleClaimableEnabled();
    event WhitelistUpdated(address indexed account, bool status);
    event FundsWithdrawn(address indexed recipient, uint256 amount);

    /**
     * @param _token          Address of the ERC-20 token being sold.
     * @param _paymentToken   Payment token address, or address(0) for native ETH.
     * @param _presalePrice   Tokens granted per 1 whole unit of payment currency.
     * @param _startTime      Unix timestamp when the presale opens.
     * @param _endTime        Unix timestamp when the presale closes.
     * @param _hardCap        Maximum payment currency to raise.
     * @param _softCap        Minimum payment currency to raise.
     * @param _minPurchase    Minimum contribution per buyer.
     * @param _maxPurchase    Maximum cumulative contribution per buyer.
     */
    constructor(
        address _token,
        address _paymentToken,
        uint256 _presalePrice,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _hardCap,
        uint256 _softCap,
        uint256 _minPurchase,
        uint256 _maxPurchase
    ) Ownable(msg.sender) {
        require(_token != address(0), "VelocityPresale: token is the zero address");
        require(_presalePrice > 0, "VelocityPresale: price must be positive");
        require(_endTime > _startTime, "VelocityPresale: end must be after start");
        require(_hardCap > 0, "VelocityPresale: hard cap must be positive");
        require(_softCap <= _hardCap, "VelocityPresale: soft cap exceeds hard cap");
        require(_maxPurchase >= _minPurchase, "VelocityPresale: max below min");

        token = IERC20(_token);
        paymentToken = _paymentToken;
        presalePrice = _presalePrice;
        startTime = _startTime;
        endTime = _endTime;
        hardCap = _hardCap;
        softCap = _softCap;
        minPurchase = _minPurchase;
        maxPurchase = _maxPurchase;
    }

    // ---------------------------------------------------------------------
    // Purchasing
    // ---------------------------------------------------------------------

    /// @notice Buy tokens with the native currency (ETH).
    function buyTokens() external payable nonReentrant {
        require(paymentToken == address(0), "VelocityPresale: native currency not accepted");
        _buy(msg.sender, msg.value);
    }

    /**
     * @notice Buy tokens with the configured ERC-20 payment token.
     * @param _amount Amount of payment tokens to spend.
     */
    function buyTokensWithToken(uint256 _amount) external nonReentrant {
        require(paymentToken != address(0), "VelocityPresale: token payments disabled");
        IERC20(paymentToken).safeTransferFrom(msg.sender, address(this), _amount);
        _buy(msg.sender, _amount);
    }

    /// @dev Shared purchase logic for both payment methods.
    function _buy(address buyer, uint256 paymentAmount) internal {
        require(!presaleEnded, "VelocityPresale: presale has ended");
        require(block.timestamp >= startTime, "VelocityPresale: presale not started");
        require(block.timestamp <= endTime, "VelocityPresale: presale window closed");
        require(paymentAmount >= minPurchase, "VelocityPresale: below minimum purchase");

        Purchase storage record = purchases[buyer];
        require(
            record.paymentAmount + paymentAmount <= maxPurchase,
            "VelocityPresale: exceeds maximum purchase"
        );
        require(totalRaised + paymentAmount <= hardCap, "VelocityPresale: hard cap reached");

        if (whitelistRequired) {
            require(isWhitelisted[buyer], "VelocityPresale: buyer not whitelisted");
        }

        uint256 tokenAmount = _tokensFor(paymentAmount);
        require(tokenAmount > 0, "VelocityPresale: zero tokens");

        if (record.paymentAmount == 0) {
            purchasers.push(buyer);
        }
        record.paymentAmount += paymentAmount;
        record.tokenAmount += tokenAmount;
        record.timestamp = block.timestamp;

        tokensSold += tokenAmount;
        totalRaised += paymentAmount;

        emit TokensPurchased(buyer, paymentAmount, tokenAmount);
    }

    /// @notice Claim purchased tokens after claiming has been enabled.
    function claimTokens() external nonReentrant {
        require(presaleClaimable, "VelocityPresale: claiming not enabled");

        Purchase storage record = purchases[msg.sender];
        require(record.tokenAmount > 0, "VelocityPresale: no tokens to claim");
        require(!record.claimed, "VelocityPresale: tokens already claimed");

        record.claimed = true;
        token.safeTransfer(msg.sender, record.tokenAmount);

        emit TokensClaimed(msg.sender, record.tokenAmount);
    }

    // ---------------------------------------------------------------------
    // Owner controls
    // ---------------------------------------------------------------------

    /// @notice End the presale early. Funds can then be withdrawn.
    function endPresale() external onlyOwner {
        require(!presaleEnded, "VelocityPresale: already ended");
        presaleEnded = true;
        emit PresaleEnded(totalRaised, tokensSold);
    }

    /// @notice Enable token claiming after the presale has ended.
    function enableClaiming() external onlyOwner {
        require(presaleEnded || block.timestamp > endTime, "VelocityPresale: presale still active");
        require(!presaleClaimable, "VelocityPresale: claiming already enabled");
        presaleClaimable = true;
        emit PresaleClaimableEnabled();
    }

    /// @notice Enable or disable whitelist enforcement.
    function setWhitelistRequired(bool _required) external onlyOwner {
        whitelistRequired = _required;
    }

    /// @notice Add a single address to the whitelist.
    function addToWhitelist(address account) external onlyOwner {
        _setWhitelisted(account, true);
    }

    /// @notice Remove a single address from the whitelist.
    function removeFromWhitelist(address account) external onlyOwner {
        _setWhitelisted(account, false);
    }

    /// @notice Add multiple addresses to the whitelist in one transaction.
    function addMultipleToWhitelist(address[] calldata accounts) external onlyOwner {
        for (uint256 i = 0; i < accounts.length; i++) {
            _setWhitelisted(accounts[i], true);
        }
    }

    /**
     * @notice Withdraw raised funds once the presale has ended and the soft cap
     *         has been met.
     * @param recipient Address receiving the funds.
     */
    function withdrawFunds(address recipient) external onlyOwner nonReentrant {
        require(presaleEnded, "VelocityPresale: presale not ended");
        require(totalRaised >= softCap, "VelocityPresale: soft cap not met");
        require(recipient != address(0), "VelocityPresale: recipient is the zero address");

        uint256 amount;
        if (paymentToken == address(0)) {
            amount = address(this).balance;
            (bool ok, ) = recipient.call{value: amount}("");
            require(ok, "VelocityPresale: native transfer failed");
        } else {
            amount = IERC20(paymentToken).balanceOf(address(this));
            IERC20(paymentToken).safeTransfer(recipient, amount);
        }

        emit FundsWithdrawn(recipient, amount);
    }

    /**
     * @notice Withdraw tokens that were never sold. Tokens that were sold but
     *         not yet claimed are reserved and remain in the contract so that
     *         buyers can still claim them.
     * @param recipient Address receiving the unsold tokens.
     */
    function withdrawUnsoldTokens(address recipient) external onlyOwner {
        require(presaleEnded, "VelocityPresale: presale not ended");
        require(recipient != address(0), "VelocityPresale: recipient is the zero address");

        uint256 balance = token.balanceOf(address(this));
        uint256 reserved = tokensSold - _tokensClaimed;
        require(balance > reserved, "VelocityPresale: no unsold tokens");

        token.safeTransfer(recipient, balance - reserved);
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    /**
     * @notice Return a summary of the presale state.
     */
    function getPresaleStatus()
        external
        view
        returns (
            uint256 _tokensSold,
            uint256 _totalRaised,
            uint256 _hardCap,
            uint256 _softCap,
            uint256 _startTime,
            uint256 _endTime,
            bool _isActive,
            bool _ended,
            bool _claimable,
            uint256 _purchaserCount
        )
    {
        return (
            tokensSold,
            totalRaised,
            hardCap,
            softCap,
            startTime,
            endTime,
            isPresaleActive(),
            presaleEnded || block.timestamp > endTime,
            presaleClaimable,
            purchasers.length
        );
    }

    /// @notice Return the full list of buyers.
    function getPurchasers() external view returns (address[] memory) {
        return purchasers;
    }

    /// @notice Return a single buyer's purchase record.
    function getUserPurchase(
        address account
    )
        external
        view
        returns (uint256 paymentAmount, uint256 tokenAmount, uint256 timestamp, bool claimed)
    {
        Purchase storage record = purchases[account];
        return (record.paymentAmount, record.tokenAmount, record.timestamp, record.claimed);
    }

    /// @notice Whether the presale is currently open for purchases.
    function isPresaleActive() internal view returns (bool) {
        return !presaleEnded && block.timestamp >= startTime && block.timestamp <= endTime;
    }

    // ---------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------

    /// @dev Compute the number of tokens (in token wei) for a payment amount.
    function _tokensFor(uint256 paymentAmount) internal view returns (uint256) {
        uint8 tokenDecimals = IERC20Metadata(address(token)).decimals();
        uint8 paymentDecimals = paymentToken == address(0)
            ? 18
            : IERC20Metadata(paymentToken).decimals();

        return (paymentAmount * presalePrice * (10 ** tokenDecimals)) / (10 ** paymentDecimals);
    }

    /// @dev Update whitelist state and emit an event.
    function _setWhitelisted(address account, bool status) internal {
        require(account != address(0), "VelocityPresale: account is the zero address");
        isWhitelisted[account] = status;
        emit WhitelistUpdated(account, status);
    }

    /// @dev Accept native currency only when configured to do so.
    receive() external payable {
        require(paymentToken == address(0), "VelocityPresale: native currency not accepted");
    }
}

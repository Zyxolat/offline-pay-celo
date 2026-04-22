// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Open escrow payments with one-time claim or refund settlement
/// @notice Funds can be claimed by the intended recipient at any time or refunded by the sender
///         while unclaimed. Each payment can only be settled once.
contract TimeLockPayments {
    struct EscrowPayment {
        address sender;
        address recipient;
        uint256 amount;
        bool claimed;
        bool refunded;
    }

    mapping(uint256 => EscrowPayment) public payments;
    mapping(address => uint256[]) public userPayments;
    uint256 public paymentCount;

    uint256 private _locked = 1;

    event PaymentCreated(
        uint256 indexed paymentId,
        address indexed sender,
        address indexed recipient,
        uint256 amount
    );
    event PaymentClaimed(uint256 indexed paymentId, address indexed recipient, uint256 amount);
    event PaymentRefunded(uint256 indexed paymentId, address indexed sender, uint256 amount);

    modifier nonReentrant() {
        require(_locked == 1, "Reentrancy blocked");
        _locked = 2;
        _;
        _locked = 1;
    }

    function createPayment(address recipient) external payable returns (uint256 paymentId) {
        return _createPayment(recipient);
    }

    function createPayment(address recipient, uint256) external payable returns (uint256 paymentId) {
        return _createPayment(recipient);
    }

    function claimPayment(uint256 paymentId) external nonReentrant {
        _claimPayment(paymentId);
    }

    function refundPayment(uint256 paymentId) external nonReentrant {
        _refundPayment(paymentId);
    }

    function cancelPayment(uint256 paymentId) external nonReentrant {
        _refundPayment(paymentId);
    }

    function getPayment(uint256 paymentId) external view returns (EscrowPayment memory) {
        EscrowPayment memory payment = payments[paymentId];
        require(payment.sender != address(0), "Payment does not exist");
        return payment;
    }

    function getUserPayments(address user) external view returns (uint256[] memory) {
        require(user != address(0), "User cannot be zero address");
        return userPayments[user];
    }

    function _createPayment(address recipient) internal returns (uint256 paymentId) {
        require(msg.value > 0, "Amount must be greater than zero");
        require(recipient != address(0), "Recipient cannot be zero address");
        require(recipient != msg.sender, "Sender and recipient must differ");

        paymentId = paymentCount;

        payments[paymentId] = EscrowPayment({
            sender: msg.sender,
            recipient: recipient,
            amount: msg.value,
            claimed: false,
            refunded: false
        });

        userPayments[recipient].push(paymentId);
        paymentCount += 1;

        emit PaymentCreated(paymentId, msg.sender, recipient, msg.value);
    }

    function _claimPayment(uint256 paymentId) internal {
        EscrowPayment storage payment = payments[paymentId];

        require(payment.sender != address(0), "Payment does not exist");
        require(msg.sender == payment.recipient, "Only recipient can claim");
        require(payment.amount > 0, "Payment not funded");
        require(!payment.claimed && !payment.refunded, "Already settled");

        uint256 amount = payment.amount;

        payment.claimed = true;

        (bool success, ) = payable(payment.recipient).call{value: amount}("");
        require(success, "Transfer to recipient failed");

        emit PaymentClaimed(paymentId, payment.recipient, amount);
    }

    function _refundPayment(uint256 paymentId) internal {
        EscrowPayment storage payment = payments[paymentId];

        require(payment.sender != address(0), "Payment does not exist");
        require(msg.sender == payment.sender, "Only sender can refund");
        require(payment.amount > 0, "Payment not funded");
        require(!payment.claimed && !payment.refunded, "Already settled");

        uint256 amount = payment.amount;

        payment.refunded = true;

        (bool success, ) = payable(payment.sender).call{value: amount}("");
        require(success, "Refund to sender failed");

        emit PaymentRefunded(paymentId, payment.sender, amount);
    }
}

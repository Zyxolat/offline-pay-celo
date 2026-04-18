// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract TimeLockPayments {
    struct Payment {
        address sender;
        address recipient;
        uint256 amount;
        uint256 deadline;
        bool claimed;
        bool refunded;
    }

    mapping(uint256 => Payment) public payments;
    mapping(address => uint256[]) public userPayments;
    uint256 public paymentCount;

    uint256 private _locked = 1;

    event PaymentCreated(
        uint256 indexed paymentId,
        address indexed sender,
        address indexed recipient,
        uint256 amount,
        uint256 deadline
    );
    event PaymentAccepted(uint256 indexed paymentId, address indexed recipient, uint256 amount);
    event PaymentRefunded(uint256 indexed paymentId, address indexed sender, uint256 amount);

    modifier nonReentrant() {
        require(_locked == 1, "Reentrancy blocked");
        _locked = 2;
        _;
        _locked = 1;
    }

    function createPayment(address recipient, uint256 duration) external payable returns (uint256 paymentId) {
        require(msg.value > 0, "Amount must be greater than zero");
        require(recipient != address(0), "Recipient cannot be zero address");
        require(recipient != msg.sender, "Sender and recipient must differ");
        require(duration > 0, "Duration must be greater than zero");

        paymentId = paymentCount;
        uint256 deadline = block.timestamp + duration;

        payments[paymentId] = Payment({
            sender: msg.sender,
            recipient: recipient,
            amount: msg.value,
            deadline: deadline,
            claimed: false,
            refunded: false
        });

        userPayments[recipient].push(paymentId);
        paymentCount += 1;

        emit PaymentCreated(paymentId, msg.sender, recipient, msg.value, deadline);
    }

    function acceptPayment(uint256 paymentId) external nonReentrant {
        Payment storage payment = payments[paymentId];

        require(payment.sender != address(0), "Payment does not exist");
        require(msg.sender == payment.recipient, "Only recipient can accept");
        require(!payment.claimed, "Payment already claimed");
        require(!payment.refunded, "Payment already refunded");
        require(block.timestamp <= payment.deadline, "Payment deadline passed");

        uint256 amount = payment.amount;

        payment.claimed = true;

        (bool success, ) = payable(payment.recipient).call{value: amount}("");
        require(success, "Transfer to recipient failed");

        emit PaymentAccepted(paymentId, payment.recipient, amount);
    }

    function refundPayment(uint256 paymentId) external nonReentrant {
        Payment storage payment = payments[paymentId];

        require(payment.sender != address(0), "Payment does not exist");
        require(msg.sender == payment.sender, "Only sender can refund");
        require(!payment.claimed, "Payment already claimed");
        require(!payment.refunded, "Payment already refunded");
        require(block.timestamp > payment.deadline, "Payment is still active");

        uint256 amount = payment.amount;

        payment.refunded = true;

        (bool success, ) = payable(payment.sender).call{value: amount}("");
        require(success, "Refund to sender failed");

        emit PaymentRefunded(paymentId, payment.sender, amount);
    }

    function getPayment(uint256 paymentId) external view returns (Payment memory) {
        Payment memory payment = payments[paymentId];
        require(payment.sender != address(0), "Payment does not exist");
        return payment;
    }

    function getUserPayments(address user) external view returns (uint256[] memory) {
        require(user != address(0), "User cannot be zero address");
        return userPayments[user];
    }
}

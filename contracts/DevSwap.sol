// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract DevSwap is ReentrancyGuard {
    IERC20 public tokenA;
    IERC20 public tokenB;

    uint256 public reserveA;
    uint256 public reserveB;

    constructor(address _tokenA , address _tokenB) {
        require(_tokenA != address(0), "Gecersiz TokenA adresi");
        require(_tokenB != address(0), "Gecersiz TokenB adresi");
        require(_tokenA != _tokenB, "Tokenlar ayni olamaz");

        tokenA = IERC20(_tokenA);
        tokenB = IERC20(_tokenB);
    }
}
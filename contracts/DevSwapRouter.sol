// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./DevSwapFactory.sol";
import "./DevSwap.sol";

contract DevSwapRouter {
    DevSwapFactory public factory;

    modifier ensureDeadline(uint256 deadline) {
        require(block.timestamp <= deadline, "Islem suresi doldu");
        _;
    }

    constructor(address _factory) {
        require(_factory != address(0), "Gecersiz factory adresi");
        factory = DevSwapFactory(_factory);
    }

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB,
        uint256 deadline
    ) external ensureDeadline(deadline) returns (uint256 lpMinted) {

        address pairAddress = factory.getPair(tokenA, tokenB);
        if (pairAddress == address(0)) {
            pairAddress = factory.createPair(tokenA, tokenB);
        }

        DevSwap pair = DevSwap(pairAddress);

        IERC20(tokenA).transferFrom(msg.sender, address(this), amountA);
        IERC20(tokenB).transferFrom(msg.sender, address(this), amountB);

        IERC20(tokenA).approve(pairAddress, amountA);
        IERC20(tokenB).approve(pairAddress, amountB);

       if (address(pair.tokenA()) == tokenA) {
            lpMinted = pair.addLiquidity(amountA, amountB);
        } else {
            lpMinted = pair.addLiquidity(amountB, amountA);
        }

        IERC20(pairAddress).transfer(msg.sender, lpMinted);
    }

    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 lpAmount,
        uint256 deadline
    ) external ensureDeadline(deadline) returns (uint256 amountA, uint256 amountB) {
        address pairAddress = factory.getPair(tokenA, tokenB);
        require(pairAddress != address(0), "Pair mevcut degil");

        DevSwap pair = DevSwap(pairAddress);

        IERC20(pairAddress).transferFrom(msg.sender, address(this), lpAmount);

        (uint256 outA, uint256 outB) = pair.removeLiquidity(lpAmount);

        
     if (address(pair.tokenA()) == tokenA) {
            amountA = outA;
            amountB = outB;
        } else {
            amountA = outB;
            amountB = outA;
        }

        IERC20(tokenA).transfer(msg.sender, amountA);
        IERC20(tokenB).transfer(msg.sender, amountB);
    }

    

}

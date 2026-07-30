// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract DevSwap is ReentrancyGuard {
    IERC20 public tokenA;
    IERC20 public tokenB;

    uint256 public reserveA;
    uint256 public reserveB;

    event LiquidityAdded( address user,  uint256 amountA,  uint256 amountB);
    event Swapped(address indexed sender, address indexed tokenIn, uint256 amountIn, uint256 amountOut);

    constructor(address _tokenA , address _tokenB) {
        require(_tokenA != address(0), "Gecersiz TokenA adresi");
        require(_tokenB != address(0), "Gecersiz TokenB adresi");
        require(_tokenA != _tokenB, "Tokenlar ayni olamaz");

        tokenA = IERC20(_tokenA);
        tokenB = IERC20(_tokenB);
    }

    function addLiquidity (uint256 _amountA , uint256 _amountB) external nonReentrant {
        require(_amountA > 0,"TokenA miktari 0 olamaz!");
        require(_amountB > 0,"TokenB miktari 0 olamaz!");

        reserveA += _amountA;
        reserveB += _amountB;

        tokenA.transferFrom(msg.sender, address(this), _amountA);
        tokenB.transferFrom(msg.sender, address(this), _amountB);

        emit LiquidityAdded(msg.sender, _amountA , _amountB);
    }

    function swap(address _tokenIn, uint256 _amountIn) external nonReentrant returns (uint256 amountOut) {
      require(_tokenIn == address(tokenA) || _tokenIn == address(tokenB), "Gecersiz token");
      require(_amountIn > 0, "Miktar sifir olamaz!");

      bool isTokenA = _tokenIn == address(tokenA);
      IERC20 tokenIn = isTokenA ? tokenA : tokenB;
      IERC20 tokenOut = isTokenA ? tokenB : tokenA;
    
      uint256 reserveIn = isTokenA ? reserveA : reserveB;
      uint256 reserveOut = isTokenA ? reserveB : reserveA;

      require(reserveIn > 0 && reserveOut > 0, "Havuzda likidite yok!");

   
      amountOut = (reserveOut * _amountIn) / (reserveIn + _amountIn);
      require(amountOut > 0, "Cikis miktari sifir!");
      require(reserveOut >= amountOut, "Yetersiz likidite");

      if (isTokenA) {
         reserveA += _amountIn;
         reserveB -= amountOut;
      } else {
         reserveB += _amountIn;
         reserveA -= amountOut;
      }

       tokenIn.transferFrom(msg.sender, address(this), _amountIn);
       tokenOut.transfer(msg.sender, amountOut);

       emit Swapped(msg.sender, _tokenIn, _amountIn, amountOut);
    }
}
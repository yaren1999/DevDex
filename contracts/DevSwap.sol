// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;


import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract DevSwap is ERC20, ReentrancyGuard {
    IERC20 public tokenA;
    IERC20 public tokenB;

    uint256 public reserveA;
    uint256 public reserveB;

    uint256 public constant MINIMUM_LIQUIDITY = 1000;

    event LiquidityAdded( address user,  uint256 amountA,  uint256 amountB , uint256 lpMinted);
    event Swapped(address indexed sender, address indexed tokenIn, uint256 amountIn, uint256 amountOut);
    event LiquidityRemoved(address indexed provider, uint256 amountA, uint256 amountB, uint256 lpBurned);

    constructor(address _tokenA , address _tokenB) ERC20("DevSwap LP", "DSLP") {
        require(_tokenA != address(0), "Gecersiz TokenA adresi");
        require(_tokenB != address(0), "Gecersiz TokenB adresi");
        require(_tokenA != _tokenB, "Tokenlar ayni olamaz");

        tokenA = IERC20(_tokenA);
        tokenB = IERC20(_tokenB);
    }

    function addLiquidity (uint256 _amountA , uint256 _amountB) external nonReentrant returns (uint256 lpMinted) {
        require(_amountA > 0,"TokenA miktari 0 olamaz!");
        require(_amountB > 0,"TokenB miktari 0 olamaz!");

        if (totalSupply() == 0) {
            uint256 totalLp = sqrt(_amountA * _amountB);
            require(totalLp > MINIMUM_LIQUIDITY, "Yatirilan miktar cok dusuk");
            lpMinted = totalLp - MINIMUM_LIQUIDITY;

            _mint(address(0xdead), MINIMUM_LIQUIDITY);
        } else {
            uint256 lpFromA = (_amountA * totalSupply()) / reserveA;
            uint256 lpFromB = (_amountB * totalSupply()) / reserveB;

            lpMinted = lpFromA < lpFromB ? lpFromA : lpFromB;
            require(lpMinted > 0, "Yetersiz LP miktari");
        }

        reserveA += _amountA;
        reserveB += _amountB;

        tokenA.transferFrom(msg.sender, address(this), _amountA);
        tokenB.transferFrom(msg.sender, address(this), _amountB);

        _mint(msg.sender, lpMinted);
        emit LiquidityAdded(msg.sender, _amountA , _amountB , lpMinted);
    }

    function sqrt(uint256 y) internal pure returns (uint256 z) {
         if (y > 3) {
           z = y;
           uint256 x = y / 2 + 1;
           while (x < z) {
               z = x;
               x = (y / x + x) / 2;
            }
        } else if (y != 0) {
             z = 1;
        }
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

    function removeLiquidity(uint256 _lpAmount) external nonReentrant returns (uint256 amountA, uint256 amountB) {
      require(_lpAmount > 0, "LP miktari sifir olamaz");
      require(balanceOf(msg.sender) >= _lpAmount, "Yetersiz LP bakiyesi");

      uint256 supply = totalSupply();

      amountA = (_lpAmount * reserveA) / supply;
      amountB = (_lpAmount * reserveB) / supply;

      require(amountA > 0 && amountB > 0, "Cikan miktar sifir");

      _burn(msg.sender, _lpAmount);

      reserveA -= amountA;
      reserveB -= amountB;

     tokenA.transfer(msg.sender, amountA);
     tokenB.transfer(msg.sender, amountB);

     emit LiquidityRemoved(msg.sender, amountA, amountB, _lpAmount);
    }

    function getPrice(address _token) public view returns (uint256) {
      require(_token == address(tokenA) || _token == address(tokenB), "Gecersiz token");
      require(reserveA > 0 && reserveB > 0, "Havuzda likidite yok!");

       if (_token == address(tokenA)) {
          return (reserveB * 1e18) / reserveA; 
        } else {
           return (reserveA * 1e18) / reserveB; 
        }
    }
}
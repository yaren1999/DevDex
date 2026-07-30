const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DevSwap Testleri", function () {
  let TokenA, tokenA;
  let TokenB, tokenB;
  let DevSwap, devSwap;

  let owner, artist, stranger;

  const LIKIDITE_MIKTARI = ethers.parseEther("1000"); 
  const SWAP_MIKTARI = ethers.parseEther("100");      

  beforeEach(async function () {
     [owner, artist, stranger] = await ethers.getSigners();

     TokenA = await ethers.getContractFactory("TokenA");
     tokenA = await TokenA.deploy();

     TokenB = await ethers.getContractFactory("TokenB");
     tokenB = await TokenB.deploy();

     DevSwap = await ethers.getContractFactory("DevSwap");
     devSwap = await DevSwap.deploy(tokenA.target, tokenB.target);

     await tokenA.approve(devSwap.target, ethers.MaxUint256); 
     await tokenB.approve(devSwap.target, ethers.MaxUint256); 

     await tokenA.transfer(artist.address, ethers.parseEther("1000"));
     await tokenB.transfer(artist.address, ethers.parseEther("1000"));

     await tokenA.connect(artist).approve(devSwap.target, ethers.MaxUint256); 
     await tokenB.connect(artist).approve(devSwap.target, ethers.MaxUint256); 
  });

  describe("DevSwap Deployment Testleri", function () {
    it("Gecersiz TokenA adresi engellenmeli", async function () {
      await expect(
        DevSwap.deploy(ethers.ZeroAddress, tokenB.target)
      ).to.be.revertedWith("Gecersiz TokenA adresi");
    });

    it("Gecersiz TokenB adresi engellenmeli", async function () {
      await expect(
        DevSwap.deploy(tokenA.target, ethers.ZeroAddress)
      ).to.be.revertedWith("Gecersiz TokenB adresi");
    });

    it("TokenA ve TokenB aynı tokenlar olamaz", async function () {
      await expect(
        DevSwap.deploy(tokenA.target, tokenA.target)
      ).to.be.revertedWith("Tokenlar ayni olamaz");
    });

    it("Constructor doğru çalışmalı ve adresleri kaydetmeli", async function () {
      expect(await devSwap.tokenA()).to.equal(tokenA.target);
      expect(await devSwap.tokenB()).to.equal(tokenB.target);
    });
  });

  describe("AddLiquidity Testleri", function () {
    it("TokenA miktari sifirdan buyuk olmali", async function () {
      await expect(
        devSwap.connect(artist).addLiquidity(0, 100)
      ).to.be.revertedWith("TokenA miktari 0 olamaz!");
    });

    it("TokenB miktari sifirdan buyuk olmali", async function () {
      await expect(
        devSwap.connect(artist).addLiquidity(100, 0)
      ).to.be.revertedWith("TokenB miktari 0 olamaz!");
    });

    it("Add Liquidity doğru çalışmalı", async function () {
      const amount = ethers.parseEther("100");

      await tokenA.approve(devSwap.target, amount);
      await tokenB.approve(devSwap.target, amount);

      await devSwap.addLiquidity(amount, amount);

      expect(await devSwap.reserveA()).to.equal(amount);
      expect(await devSwap.reserveB()).to.equal(amount);
    });
  });
  
  it("Havuzda likidite yoksa swap engellenmeli", async function () {
      await expect(
       devSwap.connect(artist).swap(tokenA.target, SWAP_MIKTARI)
      ).to.be.revertedWith("Havuzda likidite yok!");
    });

  describe("Swap testleri", function () {
    beforeEach(async function () {
      await devSwap.addLiquidity(LIKIDITE_MIKTARI, LIKIDITE_MIKTARI);
    });

    it("Geçersiz bir token adresi girilirse engellenmeli", async function () {
       const BosAdres = owner.address; 
       await expect(
         devSwap.connect(artist).swap(BosAdres, SWAP_MIKTARI)
       ).to.be.revertedWith("Gecersiz token");
    });

    it("Giren miktar 0 ise engellenmeli", async function () {
      await expect(
        devSwap.connect(artist).swap(tokenA.target, 0)
      ).to.be.revertedWith("Miktar sifir olamaz!");
    });

    

    it("x*y=k formülü doğru çalışmalı (Çıkan miktar matematiksel olarak birebir tutmalı)", async function () {
     const expectedOut = (LIKIDITE_MIKTARI * SWAP_MIKTARI) / (LIKIDITE_MIKTARI + SWAP_MIKTARI);
     const before = await tokenB.balanceOf(artist.address);
    
     await devSwap.connect(artist).swap(tokenA.target, SWAP_MIKTARI);
     const after = await tokenB.balanceOf(artist.address);
     expect(after - before).to.equal(expectedOut);
    });

    it("TKA -> TKB swap çalışmalı (Artist TokenA verip TokenB almalı)", async function () {
     const before = await tokenB.balanceOf(artist.address);
     await devSwap.connect(artist).swap(tokenA.target, SWAP_MIKTARI);
     const after = await tokenB.balanceOf(artist.address);
     expect(after).to.be.above(before);
    });

    it("TKB -> TKA swap çalışmalı (Artist TokenB verip TokenA almalı)", async function () {
     const before = await tokenA.balanceOf(artist.address);
     await devSwap.connect(artist).swap(tokenB.target, SWAP_MIKTARI);
     const after = await tokenA.balanceOf(artist.address);
     expect(after).to.be.above(before);
   });
    
    it("State/Effects: Swap sonrası reserveA ve reserveB doğru güncellenmeli", async function () {
      const expectedOut = (LIKIDITE_MIKTARI * SWAP_MIKTARI) / (LIKIDITE_MIKTARI + SWAP_MIKTARI);

      await devSwap.connect(artist).swap(tokenA.target, SWAP_MIKTARI);
      expect(await devSwap.reserveA()).to.equal(LIKIDITE_MIKTARI + SWAP_MIKTARI);
      expect(await devSwap.reserveB()).to.equal(LIKIDITE_MIKTARI - expectedOut);
    });
    
    it("Swapped eventi doğru parametrelerle tetiklenmeli (emit edilmeli)", async function () {
    const beklenentCikti = (LIKIDITE_MIKTARI * SWAP_MIKTARI) / (LIKIDITE_MIKTARI + SWAP_MIKTARI);
    await expect(devSwap.connect(artist).swap(tokenA.target, SWAP_MIKTARI))
      .to.emit(devSwap, "Swapped")
      .withArgs(
          artist.address,   
          tokenA.target,    
          SWAP_MIKTARI,     
          beklenentCikti   
        );
    }); 
   
  });

});
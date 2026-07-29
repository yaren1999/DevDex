const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DevSwap Testleri", function () {
  let TokenA, tokenA;
  let TokenB, tokenB;
  let DevSwap, devSwap;

  let owner, artist, stranger;

  beforeEach(async function () {
    [owner, artist, stranger] = await ethers.getSigners();

    TokenA = await ethers.getContractFactory("TokenA");
    tokenA = await TokenA.deploy();

    TokenB = await ethers.getContractFactory("TokenB");
    tokenB = await TokenB.deploy();

    DevSwap = await ethers.getContractFactory("DevSwap");
    devSwap = await DevSwap.deploy(tokenA.target, tokenB.target);
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
});
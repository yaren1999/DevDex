const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DevSwapRouter Testleri", function () {
  let tokenA, tokenB;
  let factory, router;
  let owner, artist;

  const AMOUNT_A = ethers.parseEther("1000");
  const AMOUNT_B = ethers.parseEther("1000");

  async function futureDeadline(secondsFromNow = 3600) {
    const latestBlock = await ethers.provider.getBlock("latest");
    return latestBlock.timestamp + secondsFromNow;
  }

  beforeEach(async function () {
    [owner, artist] = await ethers.getSigners();

    const TokenA = await ethers.getContractFactory("TokenA");
    tokenA = await TokenA.deploy();

    const TokenB = await ethers.getContractFactory("TokenB");
    tokenB = await TokenB.deploy();

    const Factory = await ethers.getContractFactory("DevSwapFactory");
    factory = await Factory.deploy();

    const Router = await ethers.getContractFactory("DevSwapRouter");
    router = await Router.deploy(factory.target);
    await tokenA.approve(router.target, ethers.MaxUint256);
    await tokenB.approve(router.target, ethers.MaxUint256);

    await tokenA.transfer(artist.address, ethers.parseEther("1000"));
    await tokenB.transfer(artist.address, ethers.parseEther("1000"));

    await tokenA.connect(artist).approve(router.target, ethers.MaxUint256);
    await tokenB.connect(artist).approve(router.target, ethers.MaxUint256);
  });

  describe("Constructor Testleri", function () {
    it("Gecersiz factory adresi (zero address) engellenmeli", async function () {
      const Router = await ethers.getContractFactory("DevSwapRouter");
      await expect(
        Router.deploy(ethers.ZeroAddress)
      ).to.be.revertedWith("Gecersiz factory adresi");
    });

    it("Factory adresi dogru kaydedilmeli", async function () {
      expect(await router.factory()).to.equal(factory.target);
    });
  });

  describe("addLiquidity Testleri", function () {
    it("Deadline gecmisse revert etmeli", async function () {
      const gecmisDeadline = (await ethers.provider.getBlock("latest")).timestamp - 1;

      await expect(
        router.addLiquidity(tokenA.target, tokenB.target, AMOUNT_A, AMOUNT_B, gecmisDeadline)
      ).to.be.revertedWith("Islem suresi doldu");
    });

    it("Pair hic yoksa, Router otomatik olarak Factory'de olusturmali", async function () {
      expect(await factory.getPair(tokenA.target, tokenB.target)).to.equal(ethers.ZeroAddress);
      const deadline = await futureDeadline();

      await router.addLiquidity(tokenA.target, tokenB.target, AMOUNT_A, AMOUNT_B, deadline);
      const pairAddress = await factory.getPair(tokenA.target, tokenB.target);
      expect(pairAddress).to.not.equal(ethers.ZeroAddress);
    });

    it("Pair zaten varsa, YENIDEN olusturmadan mevcut pair'i kullanmali", async function () {
      const deadline = await futureDeadline();
      await router.addLiquidity(tokenA.target, tokenB.target, AMOUNT_A, AMOUNT_B, deadline);
      const pairAddressOnce = await factory.getPair(tokenA.target, tokenB.target);

      await router.connect(artist).addLiquidity(
        tokenA.target, tokenB.target,
        ethers.parseEther("100"), ethers.parseEther("100"),
        deadline
      );
      const pairAddressTwice = await factory.getPair(tokenA.target, tokenB.target);

      expect(pairAddressOnce).to.equal(pairAddressTwice);
      expect(await factory.allPairsLength()).to.equal(1);
    });

    it("LP token KULLANICIYA gitmeli, Router'da kalmamali", async function () {
      const deadline = await futureDeadline();
      await router.addLiquidity(tokenA.target, tokenB.target, AMOUNT_A, AMOUNT_B, deadline);

      const pairAddress = await factory.getPair(tokenA.target, tokenB.target);
      const DevSwap = await ethers.getContractFactory("DevSwap");
      const pairContract = DevSwap.attach(pairAddress);

      const ownerLP = await pairContract.balanceOf(owner.address);
      const routerLP = await pairContract.balanceOf(router.target);

      expect(ownerLP).to.be.above(0n);
      expect(routerLP).to.equal(0n);
    });

    it("Token bakiyesi kullanicinin cuzdanindan cikmali", async function () {
      const beforeA = await tokenA.balanceOf(owner.address);
      const beforeB = await tokenB.balanceOf(owner.address);

      const deadline = await futureDeadline();
      await router.addLiquidity(tokenA.target, tokenB.target, AMOUNT_A, AMOUNT_B, deadline);

      const afterA = await tokenA.balanceOf(owner.address);
      const afterB = await tokenB.balanceOf(owner.address);

      expect(beforeA - afterA).to.equal(AMOUNT_A);
      expect(beforeB - afterB).to.equal(AMOUNT_B);
    });

    it("Token sirasi ters verilse bile (tokenB, tokenA) dogru calismali", async function () {
      const deadline = await futureDeadline();
      await router.addLiquidity(tokenB.target, tokenA.target, AMOUNT_B, AMOUNT_A, deadline);

      const pairAddress = await factory.getPair(tokenA.target, tokenB.target);
      const DevSwap = await ethers.getContractFactory("DevSwap");
      const pairContract = DevSwap.attach(pairAddress);

      expect(await pairContract.reserveA()).to.be.above(0n);
      expect(await pairContract.reserveB()).to.be.above(0n);
    });
  });
 
});
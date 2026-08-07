const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DevSwapFactory Testleri", function () {
  let TokenA, tokenA;
  let TokenB, tokenB;
  let TokenC, tokenC;
  let Factory, factory;

  let owner, artist;

  beforeEach(async function () {
    [owner, artist] = await ethers.getSigners();

    TokenA = await ethers.getContractFactory("TokenA");
    tokenA = await TokenA.deploy();

    TokenB = await ethers.getContractFactory("TokenB");
    tokenB = await TokenB.deploy();

    
    TokenC = await ethers.getContractFactory("TokenB"); 
    tokenC = await TokenC.deploy();

    Factory = await ethers.getContractFactory("DevSwapFactory");
    factory = await Factory.deploy();
  });

 
  describe("createPair Testleri", function () {
    describe("require testleri", function () {
      it("Gecersiz tokenA (zero address) engellenmeli", async function () {
        await expect(
          factory.createPair(ethers.ZeroAddress, tokenB.target)
        ).to.be.revertedWith("Gecersiz tokenA adresi");
      });

      it("Gecersiz tokenB (zero address) engellenmeli", async function () {
        await expect(
          factory.createPair(tokenA.target, ethers.ZeroAddress)
        ).to.be.revertedWith("Gecersiz tokenB adresi");
      });

      it("Ayni token ile pair olusturulamamali", async function () {
        await expect(
          factory.createPair(tokenA.target, tokenA.target)
        ).to.be.revertedWith("Tokenlar ayni olamaz");
      });

      it("Ayni cift icin ikinci kez pair olusturulamamali", async function () {
        await factory.createPair(tokenA.target, tokenB.target);

        await expect(
          factory.createPair(tokenA.target, tokenB.target)
        ).to.be.revertedWith("Pair zaten mevcut");
      });

      it("Ters sirada verilse bile (B,A) ayni cift icin ikinci kez olusturulamamali", async function () {
        await factory.createPair(tokenA.target, tokenB.target);

        await expect(
          factory.createPair(tokenB.target, tokenA.target)
        ).to.be.revertedWith("Pair zaten mevcut");
      });
    });

    describe("Basarili pair olusturma", function () {
      it("getPair dogru adresi donmeli (her iki yonden de)", async function () {
        await factory.createPair(tokenA.target, tokenB.target);

        const pairAddress = await factory.getPair(tokenA.target, tokenB.target);
        const reversePairAddress = await factory.getPair(tokenB.target, tokenA.target);

        expect(pairAddress).to.not.equal(ethers.ZeroAddress);
        expect(pairAddress).to.equal(reversePairAddress);
      });

      it("Olusturulan pair, gercek bir DevSwap kontrati olmali (dogru tokenlari tutmali)", async function () {
        await factory.createPair(tokenA.target, tokenB.target);
        const pairAddress = await factory.getPair(tokenA.target, tokenB.target);

        const DevSwap = await ethers.getContractFactory("DevSwap");
        const pairContract = DevSwap.attach(pairAddress);

        expect(await pairContract.tokenA()).to.equal(tokenA.target);
        expect(await pairContract.tokenB()).to.equal(tokenB.target);
      });

      it("allPairs dizisine eklenmeli", async function () {
        await factory.createPair(tokenA.target, tokenB.target);

        const pairAddress = await factory.getPair(tokenA.target, tokenB.target);
        expect(await factory.allPairs(0)).to.equal(pairAddress);
      });

      it("allPairsLength dogru artmali", async function () {
        expect(await factory.allPairsLength()).to.equal(0);

        await factory.createPair(tokenA.target, tokenB.target);
        expect(await factory.allPairsLength()).to.equal(1);

        await factory.createPair(tokenA.target, tokenC.target);
        expect(await factory.allPairsLength()).to.equal(2);
      });

      it("PairCreated eventi dogru parametrelerle firlamali", async function () {
        const DevSwap = await ethers.getContractFactory("DevSwap");

        const salt = ethers.keccak256(
          ethers.AbiCoder.defaultAbiCoder().encode(
            ["address", "address"],
            [tokenA.target, tokenB.target]
          )
        );

        await expect(factory.createPair(tokenA.target, tokenB.target))
          .to.emit(factory, "PairCreated");
      });

      it("Farkli token ciftleri icin farkli pair adresleri uretilmeli", async function () {
        await factory.createPair(tokenA.target, tokenB.target);
        await factory.createPair(tokenA.target, tokenC.target);

        const pairAB = await factory.getPair(tokenA.target, tokenB.target);
        const pairAC = await factory.getPair(tokenA.target, tokenC.target);

        expect(pairAB).to.not.equal(pairAC);
      });
    });
  });


  describe("allPairsLength Testleri", function () {
    it("Hic pair yokken 0 donmeli", async function () {
      expect(await factory.allPairsLength()).to.equal(0);
    });

    it("Birden fazla pair olusturulunca dogru sayilmali", async function () {
      await factory.createPair(tokenA.target, tokenB.target);
      await factory.createPair(tokenA.target, tokenC.target);
      await factory.createPair(tokenB.target, tokenC.target);

      expect(await factory.allPairsLength()).to.equal(3);
    });
  });
});
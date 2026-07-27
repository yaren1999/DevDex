const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TokenA & TokenB Testleri", function () {
    let TokenA, tokenA;
    let TokenB, tokenB;
    
    let owner, artist, stranger;

    beforeEach(async function () {
        [owner, artist, stranger] = await ethers.getSigners();

        TokenA = await ethers.getContractFactory("TokenA");
        tokenA = await TokenA.deploy();

        TokenB = await ethers.getContractFactory("TokenB");
        tokenB = await TokenB.deploy();
    });

    describe("TokenA deployment testleri", function () {
      it("isim ve sembol doğru olmalı", async function () {
         expect(await tokenA.name()).to.equal("Token A");
         expect(await tokenA.symbol()).to.equal("TKA");
      });

      it("Toplam arz doğru olmalı", async function () {
          const toplamArz = ethers.parseEther("1000000");
          expect(await tokenA.totalSupply()).to.equal(toplamArz);
      });

      it("Bütün tokenlar deploy eden kişinin olmalı", async function () {
          const deployArz = ethers.parseEther("1000000");
          expect(await tokenA.balanceOf(owner.address)).to.equal(deployArz);
       });
   });

   describe("TokenB deployment testleri", function () {
      it("isim ve sembol doğru olmalı", async function () {
         expect(await tokenB.name()).to.equal("Token B");
         expect(await tokenB.symbol()).to.equal("TKB");
      });

      it("Toplam arz doğru olmalı", async function () {
         const toplamArz = ethers.parseEther("1000000");
         expect(await tokenB.totalSupply()).to.equal(toplamArz);
       });

       it("Bütün tokenlar deploy eden kişinin olmalı", async function () {
          const deployArz = ethers.parseEther("1000000");
          expect(await tokenB.balanceOf(owner.address)).to.equal(deployArz);
       });
    });
});
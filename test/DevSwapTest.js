const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DevSwap Testleri", function () {
let TokenA, tokenA;
let TokenB, tokenB;
let DevSwap; 

let owner, artist, stranger;

  beforeEach(async function () {
     [owner, artist, stranger] = await ethers.getSigners();

     TokenA = await ethers.getContractFactory("TokenA");
     tokenA = await TokenA.deploy();

     TokenB = await ethers.getContractFactory("TokenB");
     tokenB = await TokenB.deploy();

     DevSwap = await ethers.getContractFactory("DevSwap");
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
          const devSwap = await DevSwap.deploy(tokenA.target, tokenB.target);

          expect(await devSwap.tokenA()).to.equal(tokenA.target);
          expect(await devSwap.tokenB()).to.equal(tokenB.target);
       });
   });

});
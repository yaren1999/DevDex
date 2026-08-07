const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DevSwap Testleri", function () {
  let TokenA, tokenA;
  let TokenB, tokenB;
  let DevSwap, devSwap;

  let owner, artist, stranger;

  const LIKIDITE_MIKTARI = ethers.parseEther("1000");
  const SWAP_MIKTARI = ethers.parseEther("100");

  
  function sqrtBigInt(y) {
    if (y > 3n) {
      let z = y;
      let x = y / 2n + 1n;
      while (x < z) {
        z = x;
        x = (y / x + x) / 2n;
      }
      return z;
    } else if (y !== 0n) {
      return 1n;
    }
    return 0n;
  }

  function getAmountOut(amountIn, reserveIn, reserveOut) {
    const amountInWithFee = amountIn * 997n;
    return (reserveOut * amountInWithFee) / (reserveIn * 1000n + amountInWithFee);
  }

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

    it("LP token isim ve sembolü doğru olmalı", async function () {
      expect(await devSwap.name()).to.equal("DevSwap LP");
      expect(await devSwap.symbol()).to.equal("DSLP");
    });
  });

  
  describe("addLiquidity Testleri", function () {
    
      it("TokenA miktari 0 ise revert etmeli", async function () {
        await expect(
          devSwap.addLiquidity(0, ethers.parseEther("100"))
        ).to.be.revertedWith("TokenA miktari 0 olamaz!");
      });

      it("TokenB miktari 0 ise revert etmeli", async function () {
        await expect(
          devSwap.addLiquidity(ethers.parseEther("100"), 0)
        ).to.be.revertedWith("TokenB miktari 0 olamaz!");
      });
    });

    describe("İlk likidite sağlayıcı", function () {
      it("Cok kucuk miktar verilirse revert etmeli", async function () {
        await expect(
          devSwap.addLiquidity(500, 500)
        ).to.be.revertedWith("Yatirilan miktar cok dusuk");
      });

      it("Dogru miktarda LP token almali (sqrt formulu)", async function () {
        const amountA = ethers.parseEther("1000");
        const amountB = ethers.parseEther("1000");

        await devSwap.addLiquidity(amountA, amountB);

        const beklenenLP = sqrtBigInt(amountA * amountB) - 1000n;
        expect(await devSwap.balanceOf(owner.address)).to.equal(beklenenLP);
      });

      it("MINIMUM_LIQUIDITY kadar LP, 0xdead adresine kilitlenmeli", async function () {
        await devSwap.addLiquidity(
          ethers.parseEther("1000"),
          ethers.parseEther("1000")
        );

        const deadAdres = "0x000000000000000000000000000000000000dEaD";
        expect(await devSwap.balanceOf(deadAdres)).to.equal(1000n);
      });

      it("Rezervler dogru artmali", async function () {
        const amount = ethers.parseEther("1000");
        await devSwap.addLiquidity(amount, amount);

        expect(await devSwap.reserveA()).to.equal(amount);
        expect(await devSwap.reserveB()).to.equal(amount);
      });

      it("Token bakiyesi cuzdandan cikmali", async function () {
        const amount = ethers.parseEther("1000");
        const beforeA = await tokenA.balanceOf(owner.address);
        const beforeB = await tokenB.balanceOf(owner.address);

        await devSwap.addLiquidity(amount, amount);

        const afterA = await tokenA.balanceOf(owner.address);
        const afterB = await tokenB.balanceOf(owner.address);

        expect(beforeA - afterA).to.equal(amount);
        expect(beforeB - afterB).to.equal(amount);
      });

      it("LiquidityAdded eventi dogru parametrelerle firlamali", async function () {
        const amount = ethers.parseEther("1000");
        const beklenenLP = sqrtBigInt(amount * amount) - 1000n;

        await expect(devSwap.addLiquidity(amount, amount))
          .to.emit(devSwap, "LiquidityAdded")
          .withArgs(owner.address, amount, amount, beklenenLP);
      });
    });

    describe("İkinci likidite sağlayıcı (havuz dolu)", function () {
      beforeEach(async function () {
        await devSwap.addLiquidity(
          ethers.parseEther("1000"),
          ethers.parseEther("1000")
        );
      });

      it("Esit oranda eklerse, orantili LP almali", async function () {
        const totalSupplyOnce = await devSwap.totalSupply();

        await devSwap.connect(artist).addLiquidity(
          ethers.parseEther("500"),
          ethers.parseEther("500")
        );

        const artistLP = await devSwap.balanceOf(artist.address);
        expect(artistLP).to.equal(totalSupplyOnce / 2n);
      });

      it("Orani bozan eklerse, kucuk olan taraf esas alinmali", async function () {
        const totalSupplyOnce = await devSwap.totalSupply();

        await devSwap.connect(artist).addLiquidity(
          ethers.parseEther("500"),
          ethers.parseEther("1000")
        );

        const artistLP = await devSwap.balanceOf(artist.address);
       
        const beklenenLP =
          (ethers.parseEther("500") * totalSupplyOnce) /
          ethers.parseEther("1000");

        expect(artistLP).to.equal(beklenenLP);
      });

      it("Rezervler ikinci eklemeden sonra dogru toplanmali", async function () {
        await devSwap.connect(artist).addLiquidity(
          ethers.parseEther("500"),
          ethers.parseEther("500")
        );

        expect(await devSwap.reserveA()).to.equal(ethers.parseEther("1500"));
        expect(await devSwap.reserveB()).to.equal(ethers.parseEther("1500"));
      });
    
    it("Cok kucuk miktar eklerse LP=0 cikip revert etmeli", async function () {
  
      await devSwap.connect(artist).addLiquidity(
         ethers.parseEther("1000"),
         1
      );

  
      await tokenA.transfer(stranger.address, ethers.parseEther("1"));
      await tokenB.transfer(stranger.address, ethers.parseEther("1"));
      await tokenA.connect(stranger).approve(devSwap.target, ethers.MaxUint256);
      await tokenB.connect(stranger).approve(devSwap.target, ethers.MaxUint256);

      await expect(
         devSwap.connect(stranger).addLiquidity(1, 1)
       ).to.be.revertedWith("Yetersiz LP miktari");
    });
    
  });


  describe("Swap testleri", function () {
    beforeEach(async function () {
      await devSwap.addLiquidity(LIKIDITE_MIKTARI, LIKIDITE_MIKTARI);
    });

    it("Havuzda likidite yoksa swap engellenmeli", async function () {
      const DevSwapFresh = await ethers.getContractFactory("DevSwap");
      const devSwapFresh = await DevSwapFresh.deploy(tokenA.target, tokenB.target);

      await expect(
        devSwapFresh.connect(artist).swap(tokenA.target, SWAP_MIKTARI)  
      ).to.be.revertedWith("Havuzda likidite yok!");
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

    it("x*y=k formülü fee ile doğru çalışmalı", async function () {
      const expectedOut = getAmountOut(SWAP_MIKTARI, LIKIDITE_MIKTARI, LIKIDITE_MIKTARI);
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
      const expectedOut = getAmountOut(SWAP_MIKTARI, LIKIDITE_MIKTARI, LIKIDITE_MIKTARI);

      await devSwap.connect(artist).swap(tokenA.target, SWAP_MIKTARI);
      expect(await devSwap.reserveA()).to.equal(LIKIDITE_MIKTARI + SWAP_MIKTARI);
      expect(await devSwap.reserveB()).to.equal(LIKIDITE_MIKTARI - expectedOut);
    });

    it("Swapped eventi doğru parametrelerle tetiklenmeli", async function () {
      const beklenentCikti = getAmountOut(SWAP_MIKTARI, LIKIDITE_MIKTARI, LIKIDITE_MIKTARI);
      await expect(devSwap.connect(artist).swap(tokenA.target, SWAP_MIKTARI))
        .to.emit(devSwap, "Swapped")
        .withArgs(artist.address, tokenA.target, SWAP_MIKTARI, beklenentCikti);
    });


    it("Fee'siz formülden DAHA AZ çıktı vermeli (fee kesiliyor kanıtı)", async function () {
      const feesizOut = (LIKIDITE_MIKTARI * SWAP_MIKTARI) / (LIKIDITE_MIKTARI + SWAP_MIKTARI);
      const feeliOut = getAmountOut(SWAP_MIKTARI, LIKIDITE_MIKTARI, LIKIDITE_MIKTARI);
      
      expect(feeliOut).to.be.below(feesizOut);
    });

    it(" Swap sonrası k değeri ARTMALI (fee havuzda birikiyor)", async function () {
      const kOnce = LIKIDITE_MIKTARI * LIKIDITE_MIKTARI;

      await devSwap.connect(artist).swap(tokenA.target, SWAP_MIKTARI);

      const reserveASonra = await devSwap.reserveA();
      const reserveBSonra = await devSwap.reserveB();
      const kSonra = reserveASonra * reserveBSonra;

      expect(kSonra).to.be.above(kOnce);
    });

    it(" LP sahibi fee kazancı ile daha fazla token çekebilmeli", async function () {
      await devSwap.connect(artist).swap(tokenA.target, SWAP_MIKTARI);

      const ownerLP = await devSwap.balanceOf(owner.address);
      const beforeA = await tokenA.balanceOf(owner.address);
      
      await devSwap.removeLiquidity(ownerLP);
      
      const afterA = await tokenA.balanceOf(owner.address);
      const cekilen = afterA - beforeA;
      
      expect(cekilen).to.be.above(0n);
    });
  });
  
  describe("RemoveLiquidity testleri", function () {
  beforeEach(async function () {
    await devSwap.addLiquidity(LIKIDITE_MIKTARI, LIKIDITE_MIKTARI);
  });

  it("LP miktari 0 ise revert etmeli", async function () {
    await expect(
      devSwap.removeLiquidity(0)
    ).to.be.revertedWith("LP miktari sifir olamaz");
  });

  it("Yetersiz LP bakiyesi varsa revert etmeli", async function () {
    const ownerLP = await devSwap.balanceOf(owner.address);
    
    await expect(
      devSwap.removeLiquidity(ownerLP + 1n)
    ).to.be.revertedWith("Yetersiz LP bakiyesi");
  });

  it("Likidite cikarilinca reservelar dogru dusmeli", async function () {
    const ownerLP = await devSwap.balanceOf(owner.address);
    const totalSupply = await devSwap.totalSupply();
    const reserveABefore = await devSwap.reserveA();

    const cekilecekLP = ownerLP / 2n;
    const beklenenAmountA = (cekilecekLP * reserveABefore) / totalSupply;
    await devSwap.removeLiquidity(cekilecekLP);

    expect(await devSwap.reserveA()).to.equal(reserveABefore - beklenenAmountA);
  });

  it("Cekilen tokenlar cuzdana gecmeli", async function () {
    const ownerLP = await devSwap.balanceOf(owner.address);
    const cekilecekLP = ownerLP / 2n;

    const beforeA = await tokenA.balanceOf(owner.address);
    const beforeB = await tokenB.balanceOf(owner.address);

    await devSwap.removeLiquidity(cekilecekLP);

    const afterA = await tokenA.balanceOf(owner.address);
    const afterB = await tokenB.balanceOf(owner.address);

    expect(afterA).to.be.above(beforeA);
    expect(afterB).to.be.above(beforeB);
  });

  it("LP token gercekten yakilmali (burn olmali)", async function () {
    const ownerLPBefore = await devSwap.balanceOf(owner.address);
    const cekilecekLP = ownerLPBefore / 2n;
    await devSwap.removeLiquidity(cekilecekLP);

    const ownerLPAfter = await devSwap.balanceOf(owner.address);
    expect(ownerLPBefore - ownerLPAfter).to.equal(cekilecekLP);
  });

  it("totalSupply LP yakilinca azalmali", async function () {
    const totalSupplyBefore = await devSwap.totalSupply();
    const ownerLP = await devSwap.balanceOf(owner.address);
    const cekilecekLP = ownerLP / 2n;

    await devSwap.removeLiquidity(cekilecekLP);

    const totalSupplyAfter = await devSwap.totalSupply();
    expect(totalSupplyBefore - totalSupplyAfter).to.equal(cekilecekLP);
  });

  it("LiquidityRemoved eventi dogru parametrelerle tetiklenmeli", async function () {
    const ownerLP = await devSwap.balanceOf(owner.address);
    const totalSupply = await devSwap.totalSupply();
    const reserveABefore = await devSwap.reserveA();
    const reserveBBefore = await devSwap.reserveB();

    const cekilecekLP = ownerLP / 2n;
    const beklenenAmountA = (cekilecekLP * reserveABefore) / totalSupply;
    const beklenenAmountB = (cekilecekLP * reserveBBefore) / totalSupply;

    await expect(devSwap.removeLiquidity(cekilecekLP))
      .to.emit(devSwap, "LiquidityRemoved")
      .withArgs(owner.address, beklenenAmountA, beklenenAmountB, cekilecekLP);
  });

  it("GUVENLIK: LP'si olmayan biri (stranger) hicbir sey cekememeli", async function () {
    await expect(
      devSwap.connect(stranger).removeLiquidity(1)
    ).to.be.revertedWith("Yetersiz LP bakiyesi");
  });

  it("Tum LP yakilinca havuz bosalmali", async function () {
    const ownerLP = await devSwap.balanceOf(owner.address);
    await devSwap.removeLiquidity(ownerLP);

    const reserveAAfter = await devSwap.reserveA();
    expect(reserveAAfter).to.be.below(ethers.parseEther("0.001")); 
  });
});
  
  describe("GetPrice testleri", function () {
    beforeEach(async function () {
      await devSwap.addLiquidity(LIKIDITE_MIKTARI, LIKIDITE_MIKTARI);
    });

    it("Havuzda likidite yoksa engellenmeli", async function () {
      const DevSwapFresh = await ethers.getContractFactory("DevSwap");
      const devSwapFresh = await DevSwapFresh.deploy(tokenA.target, tokenB.target);

      await expect(
        devSwapFresh.getPrice(tokenA.target)
      ).to.be.revertedWith("Havuzda likidite yok!");
    });

    it("Eşit rezervlerde 1 TKA = 1 TKB (1e18 Wei) dönmeli", async function () {
      const priceA = await devSwap.getPrice(tokenA.target);
      const priceB = await devSwap.getPrice(tokenB.target);
      const ONE_ETH = ethers.parseEther("1");

      expect(priceA).to.equal(ONE_ETH);
      expect(priceB).to.equal(ONE_ETH);
    });
  });
});
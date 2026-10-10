const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("VelocityPresale", function () {
  const PRICE = 1000n; // 1000 tokens per 1 payment unit
  const HARD_CAP = ethers.parseEther("100");
  const SOFT_CAP = ethers.parseEther("20");
  const MIN_PURCHASE = ethers.parseEther("0.01");
  const MAX_PURCHASE = ethers.parseEther("5");
  const PRESALE_FUNDING = ethers.parseEther("1000000");

  async function deployFixture(opts = {}) {
    const [owner, buyer1, buyer2, buyer3, buyer4, other] = await ethers.getSigners();
    const maxPurchase = opts.maxPurchase ?? MAX_PURCHASE;

    const Token = await ethers.getContractFactory("VelocityToken");
    const token = await Token.deploy(owner.address);

    const now = (await ethers.provider.getBlock("latest")).timestamp;
    const startTime = now + 60;
    const endTime = now + 3600;

    const Presale = await ethers.getContractFactory("VelocityPresale");
    const presale = await Presale.deploy(
      await token.getAddress(),
      ethers.ZeroAddress,
      PRICE,
      startTime,
      endTime,
      HARD_CAP,
      SOFT_CAP,
      MIN_PURCHASE,
      maxPurchase,
    );

    // Exempt the presale from fees/max-wallet so it can hold the allocation.
    await token.setFeeExempt(await presale.getAddress(), true);
    await token.transfer(await presale.getAddress(), PRESALE_FUNDING);

    return { token, presale, owner, buyer1, buyer2, buyer3, buyer4, other, startTime, endTime };
  }

  // Named fixture (loadFixture rejects anonymous functions).
  async function deployFixtureHighMax() {
    return deployFixture({ maxPurchase: ethers.parseEther("200") });
  }

  describe("Deployment", function () {
    it("stores the configuration", async function () {
      const { token, presale, startTime, endTime } = await loadFixture(deployFixture);
      expect(await presale.token()).to.equal(await token.getAddress());
      expect(await presale.paymentToken()).to.equal(ethers.ZeroAddress);
      expect(await presale.presalePrice()).to.equal(PRICE);
      expect(await presale.startTime()).to.equal(startTime);
      expect(await presale.endTime()).to.equal(endTime);
      expect(await presale.hardCap()).to.equal(HARD_CAP);
      expect(await presale.softCap()).to.equal(SOFT_CAP);
      expect(await presale.minPurchase()).to.equal(MIN_PURCHASE);
      expect(await presale.maxPurchase()).to.equal(MAX_PURCHASE);
    });

    it("validates the constructor arguments", async function () {
      const Presale = await ethers.getContractFactory("VelocityPresale");
      await expect(
        Presale.deploy(
          ethers.ZeroAddress,
          ethers.ZeroAddress,
          PRICE,
          1,
          2,
          HARD_CAP,
          SOFT_CAP,
          1,
          2,
        ),
      ).to.be.revertedWith("VelocityPresale: token is the zero address");

      await expect(
        Presale.deploy(ethers.ZeroAddress, ethers.ZeroAddress, 0, 1, 2, HARD_CAP, SOFT_CAP, 1, 2),
      ).to.be.revertedWith("VelocityPresale: token is the zero address");
    });
  });

  describe("Buying", function () {
    it("reverts before the start time", async function () {
      const { presale, buyer1 } = await loadFixture(deployFixture);
      await expect(
        presale.connect(buyer1).buyTokens({ value: ethers.parseEther("1") }),
      ).to.be.revertedWith("VelocityPresale: presale not started");
    });

    it("records a purchase and emits an event", async function () {
      const { presale, buyer1, startTime } = await loadFixture(deployFixture);
      await time.increaseTo(startTime);

      const value = ethers.parseEther("1");
      const expectedTokens = value * PRICE;

      await expect(presale.connect(buyer1).buyTokens({ value }))
        .to.emit(presale, "TokensPurchased")
        .withArgs(buyer1.address, value, expectedTokens);

      expect(await presale.tokensSold()).to.equal(expectedTokens);
      expect(await presale.totalRaised()).to.equal(value);

      const purchase = await presale.getUserPurchase(buyer1.address);
      expect(purchase.paymentAmount).to.equal(value);
      expect(purchase.tokenAmount).to.equal(expectedTokens);
      expect(purchase.claimed).to.equal(false);
    });

    it("enforces the minimum purchase", async function () {
      const { presale, buyer1, startTime } = await loadFixture(deployFixture);
      await time.increaseTo(startTime);
      await expect(
        presale.connect(buyer1).buyTokens({ value: ethers.parseEther("0.001") }),
      ).to.be.revertedWith("VelocityPresale: below minimum purchase");
    });

    it("enforces the maximum cumulative purchase", async function () {
      const { presale, buyer1, startTime } = await loadFixture(deployFixture);
      await time.increaseTo(startTime);
      await presale.connect(buyer1).buyTokens({ value: ethers.parseEther("5") });
      await expect(
        presale.connect(buyer1).buyTokens({ value: ethers.parseEther("1") }),
      ).to.be.revertedWith("VelocityPresale: exceeds maximum purchase");
    });

    it("enforces the hard cap", async function () {
      const { presale, buyer1, startTime } = await loadFixture(deployFixtureHighMax);
      await time.increaseTo(startTime);

      await presale.connect(buyer1).buyTokens({ value: HARD_CAP });
      expect(await presale.totalRaised()).to.equal(HARD_CAP);

      // A further purchase must fail on the hard cap.
      await expect(
        presale.connect(buyer1).buyTokens({ value: ethers.parseEther("0.5") }),
      ).to.be.revertedWith("VelocityPresale: hard cap reached");
    });

    it("tracks unique purchasers", async function () {
      const { presale, buyer1, buyer2, startTime } = await loadFixture(deployFixture);
      await time.increaseTo(startTime);
      await presale.connect(buyer1).buyTokens({ value: ethers.parseEther("1") });
      await presale.connect(buyer1).buyTokens({ value: ethers.parseEther("1") });
      await presale.connect(buyer2).buyTokens({ value: ethers.parseEther("1") });

      const purchasers = await presale.getPurchasers();
      expect(purchasers).to.deep.equal([buyer1.address, buyer2.address]);
    });
  });

  describe("Whitelist", function () {
    it("blocks non-whitelisted buyers when enabled", async function () {
      const { presale, buyer1, startTime } = await loadFixture(deployFixture);
      await time.increaseTo(startTime);
      await presale.setWhitelistRequired(true);

      await expect(
        presale.connect(buyer1).buyTokens({ value: ethers.parseEther("1") }),
      ).to.be.revertedWith("VelocityPresale: buyer not whitelisted");

      await expect(presale.addToWhitelist(buyer1.address))
        .to.emit(presale, "WhitelistUpdated")
        .withArgs(buyer1.address, true);

      await presale.connect(buyer1).buyTokens({ value: ethers.parseEther("1") });
      expect(await presale.totalRaised()).to.equal(ethers.parseEther("1"));
    });

    it("supports batch whitelisting and removal", async function () {
      const { presale, buyer1, buyer2 } = await loadFixture(deployFixture);
      await presale.addMultipleToWhitelist([buyer1.address, buyer2.address]);
      expect(await presale.isWhitelisted(buyer1.address)).to.equal(true);
      expect(await presale.isWhitelisted(buyer2.address)).to.equal(true);

      await presale.removeFromWhitelist(buyer1.address);
      expect(await presale.isWhitelisted(buyer1.address)).to.equal(false);
    });
  });

  describe("Ending and claiming", function () {
    it("lets the owner end the presale and blocks further purchases", async function () {
      const { presale, buyer1, startTime } = await loadFixture(deployFixture);
      await time.increaseTo(startTime);
      await presale.connect(buyer1).buyTokens({ value: ethers.parseEther("1") });

      await expect(presale.endPresale())
        .to.emit(presale, "PresaleEnded")
        .withArgs(ethers.parseEther("1"), ethers.parseEther("1000"));

      await expect(
        presale.connect(buyer1).buyTokens({ value: ethers.parseEther("1") }),
      ).to.be.revertedWith("VelocityPresale: presale has ended");
    });

    it("requires the presale to be over before enabling claiming", async function () {
      const { presale } = await loadFixture(deployFixture);
      await expect(presale.enableClaiming()).to.be.revertedWith(
        "VelocityPresale: presale still active",
      );
    });

    it("lets buyers claim tokens after the presale ends", async function () {
      const { token, presale, buyer1, startTime } = await loadFixture(deployFixture);
      await time.increaseTo(startTime);
      await presale.connect(buyer1).buyTokens({ value: ethers.parseEther("1") });
      await presale.endPresale();
      await presale.enableClaiming();

      const expectedTokens = ethers.parseEther("1000");
      await expect(presale.connect(buyer1).claimTokens())
        .to.emit(presale, "TokensClaimed")
        .withArgs(buyer1.address, expectedTokens);

      expect(await token.balanceOf(buyer1.address)).to.equal(expectedTokens);
      await expect(presale.connect(buyer1).claimTokens()).to.be.revertedWith(
        "VelocityPresale: tokens already claimed",
      );
    });
  });

  describe("Withdrawals", function () {
    it("blocks withdrawals until the soft cap is met", async function () {
      const { presale, owner, buyer1, startTime } = await loadFixture(deployFixture);
      await time.increaseTo(startTime);
      await presale.connect(buyer1).buyTokens({ value: ethers.parseEther("1") });
      await presale.endPresale();
      await expect(presale.withdrawFunds(owner.address)).to.be.revertedWith(
        "VelocityPresale: soft cap not met",
      );
    });

    it("withdraws raised funds once the soft cap is met", async function () {
      const { presale, owner, buyer1, buyer2, buyer3, buyer4, startTime } =
        await loadFixture(deployFixture);
      await time.increaseTo(startTime);
      await presale.connect(buyer1).buyTokens({ value: ethers.parseEther("5") });
      await presale.connect(buyer2).buyTokens({ value: ethers.parseEther("5") });
      await presale.connect(buyer3).buyTokens({ value: ethers.parseEther("5") });
      await presale.connect(buyer4).buyTokens({ value: ethers.parseEther("5") });
      await presale.endPresale();

      const before = await ethers.provider.getBalance(owner.address);
      const tx = await presale.withdrawFunds(owner.address);
      const receipt = await tx.wait();
      const gas = receipt.gasUsed * receipt.gasPrice;
      const after = await ethers.provider.getBalance(owner.address);

      expect(after).to.equal(before + ethers.parseEther("20") - gas);
    });

    it("withdraws only unsold tokens, reserving sold tokens for claims", async function () {
      const { token, presale, owner, buyer1, startTime } = await loadFixture(deployFixture);
      await time.increaseTo(startTime);
      await presale.connect(buyer1).buyTokens({ value: ethers.parseEther("1") });
      await presale.endPresale();

      const sold = ethers.parseEther("1000");
      await presale.withdrawUnsoldTokens(owner.address);

      // Only the unsold portion is withdrawn; the sold tokens stay reserved.
      expect(await token.balanceOf(await presale.getAddress())).to.equal(sold);

      // The buyer can still claim their full allocation afterwards.
      await presale.enableClaiming();
      await presale.connect(buyer1).claimTokens();
      expect(await token.balanceOf(buyer1.address)).to.equal(sold);
    });
  });

  describe("ERC-20 payment token", function () {
    async function tokenPaymentFixture() {
      const [owner, buyer1] = await ethers.getSigners();

      const Token = await ethers.getContractFactory("VelocityToken");
      const token = await Token.deploy(owner.address);

      const Mock = await ethers.getContractFactory("MockERC20");
      const usdc = await Mock.deploy("Mock USD", "mUSD", 6);

      const now = (await ethers.provider.getBlock("latest")).timestamp;
      const startTime = now + 60;
      const endTime = now + 3600;

      const Presale = await ethers.getContractFactory("VelocityPresale");
      const presale = await Presale.deploy(
        await token.getAddress(),
        await usdc.getAddress(),
        PRICE,
        startTime,
        endTime,
        ethers.parseUnits("100000", 6),
        ethers.parseUnits("20000", 6),
        ethers.parseUnits("10", 6),
        ethers.parseUnits("5000", 6),
      );

      await token.setFeeExempt(await presale.getAddress(), true);
      await token.transfer(await presale.getAddress(), PRESALE_FUNDING);
      await usdc.mint(buyer1.address, ethers.parseUnits("10000", 6));
      await usdc.connect(buyer1).approve(await presale.getAddress(), ethers.MaxUint256);

      return { token, usdc, presale, owner, buyer1, startTime };
    }

    it("accepts ERC-20 payments and converts decimals correctly", async function () {
      const { presale, buyer1, startTime } = await loadFixture(tokenPaymentFixture);
      await time.increaseTo(startTime);

      const payment = ethers.parseUnits("100", 6); // 100 mUSD (6 decimals)
      // 100 units * 1000 tokens/unit = 100,000 tokens (18 decimals)
      const expectedTokens = ethers.parseEther("100000");

      await presale.connect(buyer1).buyTokensWithToken(payment);
      expect(await presale.tokensSold()).to.equal(expectedTokens);
      expect(await presale.totalRaised()).to.equal(payment);
    });

    it("rejects native purchases when a payment token is configured", async function () {
      const { presale, buyer1, startTime } = await loadFixture(tokenPaymentFixture);
      await time.increaseTo(startTime);
      await expect(
        presale.connect(buyer1).buyTokens({ value: ethers.parseEther("1") }),
      ).to.be.revertedWith("VelocityPresale: native currency not accepted");
    });
  });
});

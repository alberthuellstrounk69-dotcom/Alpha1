const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("VelocityToken", function () {
  const INITIAL_SUPPLY = ethers.parseEther("10000000");
  const DEFAULT_MAX_WALLET = INITIAL_SUPPLY / 100n; // 1%

  async function deployFixture() {
    const [owner, treasury, alice, bob] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("VelocityToken");
    const token = await Token.deploy(treasury.address);
    return { token, owner, treasury, alice, bob };
  }

  describe("Deployment", function () {
    it("sets the token metadata", async function () {
      const { token } = await loadFixture(deployFixture);
      expect(await token.name()).to.equal("Velocity Token");
      expect(await token.symbol()).to.equal("VELO");
      expect(await token.decimals()).to.equal(18);
    });

    it("mints the full initial supply to the deployer", async function () {
      const { token, owner } = await loadFixture(deployFixture);
      expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY);
      expect(await token.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY);
    });

    it("sets the owner and treasury wallet", async function () {
      const { token, owner, treasury } = await loadFixture(deployFixture);
      expect(await token.owner()).to.equal(owner.address);
      expect(await token.treasuryWallet()).to.equal(treasury.address);
    });

    it("sets a default fee schedule", async function () {
      const { token } = await loadFixture(deployFixture);
      expect(await token.treasuryFee()).to.equal(200);
      expect(await token.burnFee()).to.equal(100);
      expect(await token.liquidityFee()).to.equal(100);
    });

    it("sets the default max wallet limit to 1% of supply", async function () {
      const { token } = await loadFixture(deployFixture);
      expect(await token.maxWalletLimit()).to.equal(DEFAULT_MAX_WALLET);
    });

    it("exempts the owner, treasury and contract from fees", async function () {
      const { token, owner, treasury } = await loadFixture(deployFixture);
      expect(await token.isFeeExempt(owner.address)).to.equal(true);
      expect(await token.isFeeExempt(treasury.address)).to.equal(true);
      expect(await token.isFeeExempt(await token.getAddress())).to.equal(true);
    });

    it("reverts when the treasury is the zero address", async function () {
      const Token = await ethers.getContractFactory("VelocityToken");
      await expect(Token.deploy(ethers.ZeroAddress)).to.be.revertedWith(
        "VelocityToken: treasury is the zero address",
      );
    });
  });

  describe("Transfers", function () {
    it("does not charge fees for exempt senders", async function () {
      const { token, owner, alice } = await loadFixture(deployFixture);
      await expect(token.transfer(alice.address, ethers.parseEther("1000")))
        .to.emit(token, "Transfer")
        .withArgs(owner.address, alice.address, ethers.parseEther("1000"));
      expect(await token.balanceOf(alice.address)).to.equal(ethers.parseEther("1000"));
    });

    it("applies treasury, burn and liquidity fees for non-exempt transfers", async function () {
      const { token, owner, treasury, alice, bob } = await loadFixture(deployFixture);

      // Seed alice (exempt-free transfer from the owner).
      await token.transfer(alice.address, ethers.parseEther("10000"));

      const amount = ethers.parseEther("10000");
      const treasuryCut = (amount * 200n) / 10000n; // 2%
      const burnCut = (amount * 100n) / 10000n; // 1%
      const liquidityCut = (amount * 100n) / 10000n; // 1%
      const net = amount - treasuryCut - burnCut - liquidityCut;

      const supplyBefore = await token.totalSupply();
      await token.connect(alice).transfer(bob.address, amount);

      expect(await token.balanceOf(bob.address)).to.equal(net);
      expect(await token.balanceOf(treasury.address)).to.equal(treasuryCut);
      expect(await token.balanceOf(await token.getAddress())).to.equal(liquidityCut);
      expect(await token.totalSupply()).to.equal(supplyBefore - burnCut);
    });

    it("charges no fee when the recipient is exempt", async function () {
      const { token, owner, treasury, alice } = await loadFixture(deployFixture);
      await token.transfer(alice.address, ethers.parseEther("10000"));
      await token.connect(alice).transfer(treasury.address, ethers.parseEther("5000"));
      expect(await token.balanceOf(treasury.address)).to.equal(ethers.parseEther("5000"));
    });

    it("enforces the max wallet limit for non-exempt recipients", async function () {
      const { token, owner, bob } = await loadFixture(deployFixture);
      await token.setMaxWallet(ethers.parseEther("10000"));
      await expect(token.transfer(bob.address, ethers.parseEther("20000"))).to.be.revertedWith(
        "VelocityToken: max wallet exceeded",
      );
    });

    it("supports transferFrom with allowance and fees", async function () {
      const { token, owner, alice, bob } = await loadFixture(deployFixture);
      await token.transfer(alice.address, ethers.parseEther("10000"));
      await token.connect(alice).approve(owner.address, ethers.parseEther("1000"));

      const amount = ethers.parseEther("1000");
      const fee = (amount * 400n) / 10000n;
      await token.transferFrom(alice.address, bob.address, amount);

      expect(await token.balanceOf(bob.address)).to.equal(amount - fee);
      expect(await token.allowance(alice.address, owner.address)).to.equal(0n);
    });
  });

  describe("Owner controls", function () {
    it("lets the owner update fees", async function () {
      const { token } = await loadFixture(deployFixture);
      await token.setFees(100, 50, 50);
      expect(await token.treasuryFee()).to.equal(100);
      expect(await token.burnFee()).to.equal(50);
      expect(await token.liquidityFee()).to.equal(50);
    });

    it("rejects a fee schedule above the 10% cap", async function () {
      const { token } = await loadFixture(deployFixture);
      await expect(token.setFees(500, 400, 200)).to.be.revertedWith(
        "VelocityToken: total fee exceeds maximum",
      );
    });

    it("lets the owner update the max wallet limit and disable it", async function () {
      const { token } = await loadFixture(deployFixture);
      await token.setMaxWallet(ethers.parseEther("50000"));
      expect(await token.maxWalletLimit()).to.equal(ethers.parseEther("50000"));
      await token.setMaxWallet(0);
      expect(await token.maxWalletLimit()).to.equal(0n);
    });

    it("rejects a max wallet limit that is too low", async function () {
      const { token } = await loadFixture(deployFixture);
      await expect(token.setMaxWallet(1)).to.be.revertedWith("VelocityToken: limit too low");
    });

    it("lets the owner toggle fee exemptions", async function () {
      const { token, bob } = await loadFixture(deployFixture);
      await token.setFeeExempt(bob.address, true);
      expect(await token.isFeeExempt(bob.address)).to.equal(true);
      await token.setFeeExempt(bob.address, false);
      expect(await token.isFeeExempt(bob.address)).to.equal(false);
    });

    it("restricts privileged functions to the owner", async function () {
      const { token, alice } = await loadFixture(deployFixture);
      await expect(token.connect(alice).setFees(1, 1, 1))
        .to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount")
        .withArgs(alice.address);
      await expect(
        token.connect(alice).setMaxWallet(ethers.parseEther("50000")),
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
      await expect(
        token.connect(alice).setFeeExempt(alice.address, true),
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });
  });
});

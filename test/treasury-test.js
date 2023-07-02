const { ethers, waffle, upgrades } = require("hardhat");
const { expect } = require("chai");
const uniswapFactory = require("@uniswap/v2-core/build/UniswapV2Factory.json");
const uniswapRouter = require("@uniswap/v2-periphery/build/UniswapV2Router02.json");
const WETH9 = require("@uniswap/v2-periphery/build/WETH9.json");

describe("Rance Treasury Contract Test", () => {
  let paymentToken,
    treasury,
    deployer,
    user,
    provider,
    factory,
    router,
    protocol;

  beforeEach(async () => {
    [deployer, user] = await ethers.getSigners();
    provider = waffle.provider;
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    paymentToken = await MockERC20.deploy("MUSD Token", "MUSD");
    const RanceTreasury = await ethers.getContractFactory("RanceTreasury");
    const RanceProtocol = await ethers.getContractFactory("RanceProtocol");
    const Factory = new ethers.ContractFactory(
      uniswapFactory.abi,
      uniswapFactory.bytecode,
      deployer
    );
    const Weth9 = new ethers.ContractFactory(
      WETH9.abi,
      WETH9.bytecode,
      deployer
    );
    const Router = new ethers.ContractFactory(
      uniswapRouter.abi,
      uniswapRouter.bytecode,
      deployer
    );
    treasury = await RanceTreasury.deploy(deployer.getAddress());
    factory = await Factory.deploy(deployer.getAddress());
    const weth = await Weth9.deploy();
    router = await Router.deploy(factory.address, weth.address);
    protocol = await upgrades.deployProxy(
      RanceProtocol,
      [treasury.address, router.address, paymentToken.address],
      { kind: "uups" }
    );
  });

  it("Should returns true if account is authorised", async () => {
    expect(await treasury.isAuthorized(deployer.getAddress())).to.be.true;
  });

  it("Should returns false if account is not authorised", async () => {
    expect(await treasury.isAuthorized(user.getAddress())).to.be.false;
  });

  it("Should set protocol address", async () => {
    await treasury.setInsuranceProtocolAddress(protocol.address);
    expect(await treasury.protocol()).to.equal(protocol.address);
  });

  it("Should only allow admin set protocol address", async () => {
    expect(treasury.connect(user).setInsuranceProtocolAddress(treasury.address))
      .to.be.reverted;
  });

  it("Should withdraw BNB/CRO from treasury contract", async () => {
    const amount = ethers.utils.parseUnits("50");
    await deployer.sendTransaction({ to: treasury.address, value: amount });
    const treasuryBalance = await provider.getBalance(treasury.address);
    await treasury.withdraw(amount);
    const PostTreasuryBalance = await provider.getBalance(treasury.address);
    expect(PostTreasuryBalance).to.be.equal(treasuryBalance.sub(amount));
  });

  it("Should only allow admin withdraw BNB/CRO from treasury contract", async () => {
    const amount = ethers.utils.parseUnits("50");
    await deployer.sendTransaction({ to: treasury.address, value: amount });

    expect(treasury.connect(user).withdraw(amount)).to.be.reverted;
  });

  it("Should withdraw token from treasury contract", async () => {
    const amount = ethers.utils.parseUnits("50");
    await paymentToken.transfer(treasury.address, amount);

    await paymentToken.approve(user.getAddress(), amount);
    const treasuryBalance = await paymentToken.balanceOf(treasury.address);
    await treasury.withdrawToken(
      paymentToken.address,
      user.getAddress(),
      amount
    );
    const userBalance = await paymentToken.balanceOf(user.getAddress());
    const PostTreasuryBalance = await paymentToken.balanceOf(treasury.address);
    expect(PostTreasuryBalance).to.be.equal(treasuryBalance.sub(amount));
    expect(userBalance).to.equal(amount);
  });

  it("Should allow only authorised account withdraw token from treasury contract", async () => {
    const amount = ethers.utils.parseUnits("50");
    await paymentToken.transfer(treasury.address, amount);

    await paymentToken.approve(user.getAddress(), amount);
    expect(
      treasury
        .connect(user)
        .withdrawToken(paymentToken.address, user.getAddress(), amount)
    ).to.be.reverted;
  });
});

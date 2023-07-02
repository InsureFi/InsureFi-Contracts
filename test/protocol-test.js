/* eslint-disable node/no-extraneous-require */
/* eslint-disable no-unused-expressions */
const { ethers, waffle, upgrades } = require("hardhat");
const { expect } = require("chai");
const { time } = require("@openzeppelin/test-helpers");
const uniswapFactory = require("@uniswap/v2-core/build/UniswapV2Factory.json");
const uniswapRouter = require("@uniswap/v2-periphery/build/UniswapV2Router02.json");
const WETH9 = require("@uniswap/v2-periphery/build/WETH9.json");

describe("Rance Protocol Test", () => {
  let provider,
    treasury,
    protocol,
    admin,
    user,
    user1,
    timestamp,
    elapsedTime,
    insureCoin,
    paymentToken,
    rance,
    factory,
    router,
    planId1,
    planId2,
    planId3,
    periodInSeconds,
    insuranceFees,
    uninsureFees,
    amount,
    paymentToken2,
    insureCoin2;

  beforeEach(async () => {
    [admin, user, user1] = await ethers.getSigners();
    provider = waffle.provider;
    const adminAddress = admin.getAddress();
    const user1Address = user1.getAddress();
    const RanceTreasury = await ethers.getContractFactory("RanceTreasury");
    const RanceProtocol = await ethers.getContractFactory("RanceProtocol");
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const Factory = new ethers.ContractFactory(
      uniswapFactory.abi,
      uniswapFactory.bytecode,
      admin
    );
    const Weth9 = new ethers.ContractFactory(WETH9.abi, WETH9.bytecode, admin);
    const Router = new ethers.ContractFactory(
      uniswapRouter.abi,
      uniswapRouter.bytecode,
      admin
    );
    rance = await MockERC20.deploy("Rance Token", "RANCE");
    paymentToken = await MockERC20.deploy("MUSD Token", "MUSD");
    paymentToken2 = await MockERC20.deploy("BUSD Token", "BUSD");
    insureCoin = await MockERC20.deploy("Bitcoin Token", "WBTC");
    insureCoin2 = await MockERC20.deploy("Ether Token", "WETH");
    treasury = await RanceTreasury.deploy(adminAddress);
    factory = await Factory.deploy(adminAddress);
    const weth = await Weth9.deploy();
    router = await Router.deploy(factory.address, weth.address);
    protocol = await upgrades.deployProxy(
      RanceProtocol,
      [treasury.address, router.address, paymentToken.address],
      { kind: "uups" }
    );

    timestamp = ethers.BigNumber.from((await provider.getBlock()).timestamp);

    await factory.createPair(paymentToken.address, insureCoin.address);

    await paymentToken.approve(
      protocol.address,
      ethers.utils.parseUnits("900000")
    );

    await paymentToken.approve(
      router.address,
      ethers.utils.parseUnits("900000")
    );

    await paymentToken.approve(
      treasury.address,
      ethers.utils.parseUnits("900000")
    );
    await paymentToken.transfer(
      treasury.address,
      ethers.utils.parseUnits("40000")
    );

    await paymentToken.mint(user1Address, ethers.utils.parseUnits("900000"));

    await paymentToken
      .connect(user1)
      .approve(protocol.address, ethers.utils.parseUnits("900000"));

    await insureCoin.approve(
      protocol.address,
      ethers.utils.parseUnits("900000")
    );
    await insureCoin.approve(router.address, ethers.utils.parseUnits("900000"));

    await router.addLiquidity(
      paymentToken.address,
      insureCoin.address,
      ethers.utils.parseUnits("500000"),
      ethers.utils.parseUnits("500"),
      ethers.utils.parseUnits("500000"),
      ethers.utils.parseUnits("500"),
      protocol.address,
      timestamp.add(parseInt(time.duration.minutes(5)))
    );

    await treasury.setInsuranceProtocolAddress(protocol.address);

    periodInSeconds = [15780000, 31560000, 63120000];
    insuranceFees = [100, 50, 25];
    uninsureFees = [
      ethers.utils.parseUnits("1000"),
      ethers.utils.parseUnits("2000"),
      ethers.utils.parseUnits("5000"),
    ];

    planId1 = ethers.utils.solidityKeccak256(
      ["uint32", "uint8", "uint80"],
      [periodInSeconds[0], insuranceFees[0], uninsureFees[0]]
    );

    planId2 = ethers.utils.solidityKeccak256(
      ["uint32", "uint8", "uint80"],
      [periodInSeconds[1], insuranceFees[1], uninsureFees[1]]
    );

    planId3 = ethers.utils.solidityKeccak256(
      ["uint32", "uint8", "uint80"],
      [periodInSeconds[2], insuranceFees[2], uninsureFees[2]]
    );

    amount = ethers.utils.parseUnits("200");

    await protocol.setRance(rance.address);
    await protocol.updateReferralReward(ethers.BigNumber.from("5"));
    await protocol.addInsureCoins(["WBTC"], [insureCoin.address]);
    await protocol.insure(
      planId1,
      amount,
      [paymentToken.address, insureCoin.address],
      "WBTC",
      "MUSD"
    );

    elapsedTime = 360 * 24 * 60 * 60;
  });

  describe("Contract Initialization Test", () => {
    it("Should initialize contract variable", async () => {
      expect(await protocol.uniswapRouter()).to.equal(router.address);
      expect(await protocol.treasury()).to.equal(treasury.address);
      expect(await protocol.RANCE()).to.equal(rance.address);
    });
  });

  describe("Contract Update Test", () => {
    it("Should update treasury address", async () => {
      await protocol.setTreasuryAddress(treasury.address);
      expect(await protocol.treasury()).to.equal(treasury.address);
    });

    it("Should allow only owner to update treasury address", async () => {
      expect(protocol.connect(user).setTreasuryAddress(treasury.address)).to.be
        .reverted;
    });

    it("Should check the total insurance locked for a token", async () => {
      expect(
        await protocol.getTotalInsuranceLocked(paymentToken.address)
      ).to.be.equal(await protocol.getInsureAmount(planId1, amount));
    });

    it("Should add a payment Token", async () => {
      await protocol.addPaymentToken("BUSD", paymentToken2.address);
      const tx = await protocol.getPaymentTokens(
        ethers.BigNumber.from("0"),
        ethers.BigNumber.from("2")
      );
      const actualAddress = tx[1];
      expect(actualAddress).to.equal("BUSD");
    });

    it("Should only add a payment Token that is not added", async () => {
      expect(protocol.addPaymentToken("BUSD", paymentToken.address)).to.be
        .reverted;
    });

    it("Should remove a payment Token", async () => {
      const tx = await protocol.removePaymentToken("MUSD");
      const receipt = await tx.wait();
      const removedAddress = receipt.events[1].args[0];
      expect(removedAddress).to.equal(paymentToken.address);
    });

    it("Should only remove a payment Token that is added", async () => {
      expect(protocol.removePaymentToken("BUSD")).to.be.reverted;
    });

    it("Should only allow admin add payment token", async () => {
      expect(
        protocol.connect(user).addPaymentToken("BUSD", paymentToken2.address)
      ).to.be.reverted;
    });

    it("Should only allow admin remove payment token", async () => {
      expect(protocol.connect(user).removePaymentToken("MUSD")).to.be.reverted;
    });

    it("Should add an InsureCoin", async () => {
      await protocol.addInsureCoins(["WETH"], [insureCoin2.address]);
      const tx = await protocol.getInsureCoins(
        ethers.BigNumber.from("0"),
        ethers.BigNumber.from("2")
      );
      const actualAddress = tx[1];
      expect(actualAddress).to.equal("WETH");
    });

    it("Should only add an InsureCoin that is not added", async () => {
      expect(protocol.addInsureCoins("WBTC", insureCoin.address)).to.be
        .reverted;
    });

    it("Should remove an InsureCoin", async () => {
      const tx = await protocol.removeInsureCoins(["WBTC"]);
      const receipt = await tx.wait();
      const removedAddress = receipt.events[0].args[0];
      expect(removedAddress).to.equal(insureCoin.address);
    });

    it("Should only remove an InsureCoin that is added", async () => {
      expect(protocol.removeInsureCoins("WETH")).to.be.reverted;
    });

    it("Should only allow admin add an InsureCoin", async () => {
      expect(protocol.connect(user).addInsureCoins("WETH", insureCoin2.address))
        .to.be.reverted;
    });

    it("Should only allow admin remove InsureCoin", async () => {
      expect(protocol.connect(user).removeInsureCoins("WBTC")).to.be.reverted;
    });

    it("Should returns all package plans", async () => {
      const tx = await protocol.getAllPackagePlans(
        ethers.BigNumber.from("0"),
        await protocol.getPackagePlansLength()
      );
      for (let i = 0; i < tx.length; i++) {
        const planId = ethers.utils.solidityKeccak256(
          ["uint32", "uint8", "uint80"],
          [periodInSeconds[i], insuranceFees[i], uninsureFees[i]]
        );
        expect(tx[i].planId).to.equal(planId);
        expect(tx[i].periodInSeconds).to.equal(periodInSeconds[i]);
        expect(tx[i].insuranceFee).to.equal(insuranceFees[i]);
        expect(tx[i].uninsureFee).to.equal(uninsureFees[i]);
        expect(tx[i].isActivated).to.be.true;
      }
    });

    it("Should deactivate package plan", async () => {
      await protocol.deactivatePackagePlan(planId1);
      const tx = await protocol.getAllPackagePlans(
        ethers.BigNumber.from("0"),
        ethers.BigNumber.from("1")
      );
      expect(tx[0].isActivated).to.be.false;
    });

    it("Should only deactivate package plan with valid plan id", async () => {
      const nonExistentPlanId = ethers.utils.solidityKeccak256(
        ["uint32", "uint8", "uint72"],
        [1656049378, 20, ethers.utils.parseUnits("1000")]
      );
      expect(protocol.deactivatePackagePlan(nonExistentPlanId)).to.be.reverted;
    });

    it("Should only allow admin deactivate package plan", async () => {
      expect(protocol.connect(user).deactivatePackagePlan(planId1)).to.be
        .reverted;
    });

    it("Should add a new package plan", async () => {
      const periodInSeconds = 126240000;
      const insuranceFee = 5;
      const uninsureFee = ethers.utils.parseUnits("1000");

      await protocol.addPackagePlan(periodInSeconds, insuranceFee, uninsureFee);

      const tx = await protocol.getAllPackagePlans(
        ethers.BigNumber.from("0"),
        ethers.BigNumber.from("4")
      );

      const expectedPlanId = ethers.utils.solidityKeccak256(
        ["uint32", "uint8", "uint"],
        [periodInSeconds, insuranceFee, uninsureFee]
      );
      expect(tx[3].planId).to.be.equal(expectedPlanId);
    });

    it("Should only allow admin add a new package plan", async () => {
      const periodInSeconds = 126240000;
      const insuranceFee = 5;
      const uninsureFee = ethers.utils.parseUnits("1000");

      expect(
        protocol.addPackagePlan(periodInSeconds, insuranceFee, uninsureFee)
      ).to.be.reverted;
    });

    it("Should only add a new package plan thats does not exist", async () => {
      expect(
        protocol.addPackagePlan(
          periodInSeconds[0],
          insuranceFees[0],
          uninsureFees[0]
        )
      ).to.be.reverted;
    });

    it("Should return user packages", async () => {
      const insureAmount = await protocol.getInsureAmount(planId1, amount);
      const tx = await protocol.getAllUserPackages(
        admin.getAddress(),
        ethers.BigNumber.from("0"),
        ethers.BigNumber.from("1")
      );
      expect(tx[0].user).to.equal(await admin.getAddress());
      expect(tx[0].initialDeposit).to.equal(insureAmount);
      expect(tx[0].isCancelled).to.be.false;
      expect(tx[0].isWithdrawn).to.be.false;
      expect(tx[0].insureCoin).to.equal(insureCoin.address);
      expect(tx[0].paymentToken).to.equal(paymentToken.address);
      expect(tx[0].planId).to.equal(planId1);
    });
  }); 

  describe("Insure() Test", () => {
    it("Should purchase a package plan", async () => {
      const amount = ethers.utils.parseUnits("200");
      const treasuryBalance = await paymentToken.balanceOf(treasury.address);
      await protocol.insure(
        planId2,
        amount,
        [paymentToken.address, insureCoin.address],
        "WBTC",
        "MUSD"
      );

      const tx = await protocol.getAllUserPackages(
        admin.getAddress(),
        ethers.BigNumber.from("0"),
        ethers.BigNumber.from("2")
      );
      const postBalance = await paymentToken.balanceOf(treasury.address);
      const insureAmount = await protocol.getInsureAmount(tx[1].planId, amount);
      const insuranceFee = amount.sub(insureAmount);
      expect(tx[1].user).to.be.equal(await admin.getAddress());
      expect(tx[1].planId).to.be.equal(planId2);
      expect(tx[1].initialDeposit).to.be.equal(insureAmount);
      expect(tx[1].isCancelled).to.be.false;
      expect(tx[1].isWithdrawn).to.be.false;
      expect(tx[1].insureCoin).to.equal(insureCoin.address);
      expect(tx[1].paymentToken).to.equal(paymentToken.address);
      expect(postBalance).to.be.equal(treasuryBalance.add(insuranceFee));
    });

    it("Should purchase a package plan with referrer", async () => {
      const amount = ethers.utils.parseUnits("200");
      const treasuryBalance = await paymentToken.balanceOf(treasury.address);
      await protocol
        .connect(user1)
        .insureWithReferrer(
          planId2,
          amount,
          [paymentToken.address, insureCoin.address],
          "WBTC",
          "MUSD",
          admin.getAddress()
        );

      const tx = await protocol.getAllUserPackages(
        user1.getAddress(),
        ethers.BigNumber.from("0"),
        ethers.BigNumber.from("1")
      );

      const tx1 = await protocol.getAllUserReferrals(
        admin.getAddress(),
        ethers.BigNumber.from("0"),
        ethers.BigNumber.from("1")
      );
      const postBalance = await paymentToken.balanceOf(treasury.address);
      const insureAmount = await protocol.getInsureAmount(tx[0].planId, amount);
      const insuranceFee = amount.sub(insureAmount);
      const reward = insuranceFee
        .mul(await protocol.referralPercentage())
        .div(100);
      expect(tx[0].user).to.be.equal(await user1.getAddress());
      expect(tx[0].planId).to.be.equal(planId2);
      expect(tx[0].initialDeposit).to.be.equal(insureAmount);
      expect(tx[0].isCancelled).to.be.false;
      expect(tx[0].isWithdrawn).to.be.false;
      expect(tx[0].insureCoin).to.equal(insureCoin.address);
      expect(tx[0].paymentToken).to.equal(paymentToken.address);
      expect(postBalance).to.be.equal(treasuryBalance.add(insuranceFee));
      expect(tx1[0].rewardAmount).to.equal(ethers.BigNumber.from(reward));
      expect(tx1[0].token).to.equal(paymentToken.address);
      expect(tx1[0].referrer).to.equal(await admin.getAddress());
      expect(tx1[0].claimed).to.be.false;
    });

    it("Should only purchase valid package plan", async () => {
      const amount = ethers.utils.parseUnits("200");
      const nonExistentPlanId = ethers.utils.solidityKeccak256(
        ["uint32", "uint8", "uint"],
        [126240000, 20, ethers.utils.parseUnits("1000")]
      );
      expect(
        protocol.insure(
          nonExistentPlanId,
          amount,
          [paymentToken.address, insureCoin.address],
          "WBTC",
          "MUSD"
        )
      ).to.be.reverted;
    });

    it("Should only purchase package plan with supported token", async () => {
      const amount = ethers.utils.parseUnits("200");
      expect(
        protocol.insure(
          planId2,
          amount,
          [paymentToken.address, insureCoin2.address],
          "WETH",
          "MUSD"
        )
      ).to.be.reverted;
    });

    it("Should only purchase active package plan", async () => {
      const amount = ethers.utils.parseUnits("200");
      await protocol.deactivatePackagePlan(planId1);
      expect(
        protocol.insure(
          planId1,
          amount,
          [paymentToken.address, insureCoin.address],
          "WBTC",
          "MUSD"
        )
      ).to.be.reverted;
    });
  });

  describe("Cancel() Test", () => {
    it("Should cancel package plan", async () => {
      let tx = await protocol.getAllUserPackages(
        admin.getAddress(),
        ethers.BigNumber.from("0"),
        ethers.BigNumber.from("1")
      );
      await rance.approve(protocol.address, ethers.utils.parseUnits("900000"));
      const treasuryBalance1 = await paymentToken.balanceOf(treasury.address);
      const treasuryBalance2 = await rance.balanceOf(treasury.address);

      await protocol.cancel(tx[0].packageId);
      tx = await protocol.getAllUserPackages(
        admin.getAddress(),
        ethers.BigNumber.from("0"),
        ethers.BigNumber.from("1")
      );
      const postBalance2 = await rance.balanceOf(treasury.address);
      const postBalance1 = await paymentToken.balanceOf(treasury.address);
      const insureAmount = await protocol.getInsureAmount(tx[0].planId, amount);
      const insuranceFee = amount.sub(insureAmount);
      expect(tx[0].user).to.be.equal(await admin.getAddress());
      expect(tx[0].planId).to.be.equal(planId1);
      expect(tx[0].initialDeposit).to.be.equal(insureAmount);
      expect(tx[0].isCancelled).to.be.true;
      expect(tx[0].isWithdrawn).to.be.true;
      expect(tx[0].paymentToken).to.be.equal(paymentToken.address);
      expect(tx[0].insureCoin).to.be.equal(insureCoin.address);
      expect(postBalance1).to.be.equal(treasuryBalance1.sub(insuranceFee));
      expect(postBalance2).to.be.equal(
        treasuryBalance2.add(ethers.utils.parseUnits("1000"))
      );
    });

    it("Should only cancel active package plan", async () => {
      await ethers.provider.send("evm_increaseTime", [elapsedTime]);
      await ethers.provider.send("evm_mine", []);

      const tx = await protocol.getAllUserPackages(
        admin.getAddress(),
        ethers.BigNumber.from("0"),
        ethers.BigNumber.from("1")
      );
      await rance.approve(protocol.address, ethers.utils.parseUnits("900000"));

      expect(protocol.cancel(tx[0].packageId)).to.be.reverted;
    });
  });

  describe("Withdraw() Test", () => {
    it("Should only withdraw package plan when expired", async () => {
      const tx = await protocol.getAllUserPackages(
        admin.getAddress(),
        ethers.BigNumber.from("0"),
        ethers.BigNumber.from("1")
      );
      expect(protocol.withdraw(tx[0].packageId)).to.be.reverted;
    });

    it("Should withdraw package plan when expired", async () => {
      elapsedTime = 190 * 24 * 60 * 60;
      await ethers.provider.send("evm_increaseTime", [elapsedTime]);
      await ethers.provider.send("evm_mine", []);

      let tx = await protocol.getAllUserPackages(
        admin.getAddress(),
        ethers.BigNumber.from("0"),
        ethers.BigNumber.from("1")
      );
      const treasuryBalance = await paymentToken.balanceOf(treasury.address);
      await protocol.withdraw(tx[0].packageId);
      tx = await protocol.getAllUserPackages(
        admin.getAddress(),
        ethers.BigNumber.from("0"),
        ethers.BigNumber.from("1")
      );
      const postBalance = await paymentToken.balanceOf(treasury.address);
      const insureAmount = await protocol.getInsureAmount(tx[0].planId, amount);

      expect(tx[0].user).to.be.equal(await admin.getAddress());
      expect(tx[0].planId).to.be.equal(planId1);
      expect(tx[0].initialDeposit).to.be.equal(insureAmount);
      expect(tx[0].isCancelled).to.be.false;
      expect(tx[0].isWithdrawn).to.be.true;
      expect(tx[0].paymentToken).to.be.equal(paymentToken.address);
      expect(tx[0].insureCoin).to.be.equal(insureCoin.address);
      expect(postBalance).to.be.equal(
        treasuryBalance.sub(tx[0].initialDeposit)
      );
    });

    it("Should only withdraw package plan that does not elapsed 30days after expiration", async () => {
      await ethers.provider.send("evm_increaseTime", [elapsedTime]);
      await ethers.provider.send("evm_mine", []);

      const tx = await protocol.getAllUserPackages(
        admin.getAddress(),
        ethers.BigNumber.from("0"),
        ethers.BigNumber.from("1")
      );
      expect(protocol.withdraw(tx[0].packageId)).to.be.reverted;
    });
  });
  describe("ClaimReferralReward() Test", () => {
    it("Should allow only reward owner to claim reward for a referral", async () => {
      const amount = ethers.utils.parseUnits("200");
      await protocol
        .connect(user1)
        .insureWithReferrer(
          planId2,
          amount,
          [paymentToken.address, insureCoin.address],
          "WBTC",
          "MUSD",
          admin.getAddress()
        );
      const tx = await protocol.getAllUserReferrals(
        admin.getAddress(),
        ethers.BigNumber.from("0"),
        ethers.BigNumber.from("1")
      );
      expect(protocol.claimReferralReward([tx[0].id])).to.be.reverted;
    });

    it("Should claim reward for a referral", async () => {
      const amount = ethers.utils.parseUnits("200");
      await protocol
        .connect(user1)
        .insureWithReferrer(
          planId2,
          amount,
          [paymentToken.address, insureCoin.address],
          "WBTC",
          "MUSD",
          admin.getAddress()
        );

      let tx = await protocol.getAllUserReferrals(
        admin.getAddress(),
        ethers.BigNumber.from("0"),
        ethers.BigNumber.from("1")
      );
      const treasuryBalance = await paymentToken.balanceOf(treasury.address);
      await protocol.claimReferralReward([tx[0].id]);
      tx = await protocol.getAllUserReferrals(
        admin.getAddress(),
        ethers.BigNumber.from("0"),
        ethers.BigNumber.from("1")
      );
      const postBalance = await paymentToken.balanceOf(treasury.address);

      expect(tx[0].token).to.equal(paymentToken.address);
      expect(tx[0].referrer).to.equal(await admin.getAddress());
      expect(tx[0].claimed).to.be.true;
      expect(postBalance).to.be.equal(treasuryBalance.sub(tx[0].rewardAmount));
    });

    it("Should allow only reward owner that does'nt claim reward to claim for a referral", async () => {
      const amount = ethers.utils.parseUnits("200");
      await protocol
        .connect(user1)
        .insureWithReferrer(
          planId2,
          amount,
          [paymentToken.address, insureCoin.address],
          "WBTC",
          "MUSD",
          admin.getAddress()
        );
      const tx = await protocol.getAllUserReferrals(
        admin.getAddress(),
        ethers.BigNumber.from("0"),
        ethers.BigNumber.from("1")
      );
      await protocol.claimReferralReward([tx[0].id]);

      expect(protocol.claimReferralReward([tx[0].id])).to.be.reverted;
    });
  });
});

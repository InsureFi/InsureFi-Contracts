const { ethers, upgrades } = require("hardhat");

async function main() {
  const [admin] = await ethers.getSigners();
  const Treasury = await ethers.getContractFactory("Treasury");
  const Protocol = await ethers.getContractFactory("Protocol");
  const treasury = await Treasury.deploy(admin.getAddress());
  const protocol = await upgrades.deployProxy(
    Protocol,
    [process.env.TREASURY, process.env.UNISWAP_ROUTER, process.env.USDC],
    { kind: "uups" }
  );

  await treasury.setInsuranceProtocolAddress(protocol.address);
  await protocol.addInsureCoins(
    ["WBTC", "WBNB", "WMATIC"],
    [process.env.WBTC, process.env.BNB, process.env.WMATIC]
  );

  console.log(`Protocol: ${protocol.address}`);
}
// module.exports = [admin.getAddress()];
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

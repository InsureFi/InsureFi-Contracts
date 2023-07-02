const { ethers, upgrades } = require("hardhat");
const treasure = require("../artifacts/contracts/RanceTreasury.sol/RanceTreasury.json");
const pro = require("../artifacts/contracts/RanceProtocol.sol/RanceProtocol.json");
const addr = "0xD032336EB682E702A4AAEDd15140733421a66150";
const addr2 = "0xDFe999B28A48BFb5DD674D3899B77fd4fF5CF46c";

async function main() {
  const [admin] = await ethers.getSigners();
  const treasury = new ethers.Contract(
    "0x4d4d10c5329f5dc672408E1e84106e632bb4Ae1d",
    treasure.abi,
    admin
  );
  const p = await ethers.getContractFactory("RanceProtocol");
  const protocol = await upgrades.upgradeProxy(
    "0x8D9fdFD636229Ec36c5a5597e12374c7555ddC4E",
    p
  );
  // const treasury = await Treasury.deploy(admin.getAddress());
  /* const protocol = await upgrades.deployProxy(
    Protocol,
    [process.env.TREASURY, process.env.UNISWAP_ROUTER, process.env.USDC],
    { kind: "uups" }
  );
  /* const MockERC20 = await ethers.getContractFactory("MockERC20");
  const rance = await MockERC20.deploy("Rance Token", "RANCE");

  await treasury.setInsuranceProtocolAddress(protocol.address);
  await protocol.addInsureCoins(
    ["WBTC", "WETH", "MMF", "WMATIC"],
    [process.env.WBTC, process.env.WETH, process.env.MMF, process.env.WMATIC]
  ); */

  // await protocol.updateReferralReward(ethers.BigNumber.from("5"));
  // await treasury.setInsuranceProtocolAddress(protocol.address);
  // await protocol.transferOwnership(process.env.ADMIN_ADDRESS);
  // await treasury.addAdmin(process.env.ADMIN_ADDRESS);
  console.log(`Protocol: ${protocol.address}`);
}
// module.exports = [admin.getAddress()];
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

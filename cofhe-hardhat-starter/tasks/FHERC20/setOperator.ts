import { task, types } from "hardhat/config";
import { FHZEC } from "../../types";

task("setOperator", "Set an operator for FHZEC tokens")
  .addOptionalParam("signeraddress", "The address of the signer")
  .addOptionalParam("tokenaddress", "The address of the token contract")
  .addOptionalParam("spenderaddress", "The address of the spender.")
  .addOptionalParam(
    "timestamp",
    "The timestamp for the operator",
    Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
    types.int
  )
  .setAction(async ({ signeraddress, tokenaddress, spenderaddress, timestamp }, hre) => {
    const { ethers, deployments, getNamedAccounts } = hre;
    const signerAddress = signeraddress || (await getNamedAccounts()).deployer;
    const signer = await ethers.getSigner(signerAddress);

    if (!tokenaddress) {
      const tokenDeployment = await deployments.get("FHZEC");
      tokenaddress = tokenDeployment.address; // Default to deployed
    }

    if (!spenderaddress) {
      const bridgeDeployment = await deployments.get("ZecToEthFHEBridge");
      spenderaddress = bridgeDeployment.address; // Default to deployed bridge address
    }

    const tokenContract = (await ethers.getContractAt("FHZEC", tokenaddress, signer)) as unknown as FHZEC;

    await tokenContract.setOperator(spenderaddress, timestamp);

    console.log(`Operator set successfully.`);
  });

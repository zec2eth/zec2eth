import { task } from "hardhat/config";
import { FHZEC } from "../../types";

task("isOperator", "Check if an address is an operator for FHZEC tokens")
  .addOptionalParam("signeraddress", "The address of the signer")
  .addOptionalParam("tokenaddress", "The address of the token contract")
  .addOptionalParam("holderaddress", "The address of the holder")
  .addOptionalParam("spenderaddress", "The address of the spender.")
  .setAction(async ({ signeraddress, tokenaddress, holderaddress, spenderaddress }, hre) => {
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

    if (!holderaddress) {
      holderaddress = signerAddress; // Default to user address
    }

    const tokenContract = (await ethers.getContractAt("FHZEC", tokenaddress, signer)) as unknown as FHZEC;

    const isOperator = await tokenContract.isOperator(holderaddress, spenderaddress);

    console.log(`Is ${spenderaddress} an operator for ${holderaddress} in token ${tokenaddress}?`, isOperator);
  });

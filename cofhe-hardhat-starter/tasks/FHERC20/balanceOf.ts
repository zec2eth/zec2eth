import { task } from "hardhat/config";
import { FHZEC } from "../../types";
import { cofhejs, FheTypes } from "cofhejs/node";

task("balanceOf", "Get user balance")
  .addOptionalParam("signeraddress", "The address of the signer")
  .addOptionalParam("tokenaddress", "The address of the token contract")
  .addOptionalParam("useraddress", "The address of the user")
  .setAction(async ({ signeraddress, tokenaddress, useraddress }, hre) => {
    const { ethers, getNamedAccounts, deployments, cofhe } = hre;
    const userAddress = useraddress || (await getNamedAccounts()).deployer;
    const signerAddress = signeraddress || (await getNamedAccounts()).deployer;
    const signer = await ethers.getSigner(signerAddress);

    if (!tokenaddress) {
      const tokenDeployment = await deployments.get("FHZEC");
      tokenaddress = tokenDeployment.address; // Default to deployed
    }

    const tokenContract = (await ethers.getContractAt("FHZEC", tokenaddress, signer)) as unknown as FHZEC;
    const encryptedBalance = await tokenContract.confidentialBalanceOf(userAddress);
    const indicatedBalance = await tokenContract.balanceOf(userAddress);

    console.log(`Encrypted Balance of ${userAddress} in token ${tokenaddress}`, encryptedBalance.toString());
    console.log(`Indicated Balance of ${userAddress} in token ${tokenaddress}`, indicatedBalance.toString());

    await cofhe.expectResultSuccess(
      await cofhejs.initializeWithEthers({
        ethersProvider: ethers.provider,
        ethersSigner: signer,
        environment: "TESTNET",
      })
    );
    const unsealedBalance = await cofhe.expectResultSuccess(await cofhejs.unseal(encryptedBalance, FheTypes.Uint64));

    console.log(`Unsealed Balance of ${userAddress} in token ${tokenaddress}`, unsealedBalance.toString());
  });

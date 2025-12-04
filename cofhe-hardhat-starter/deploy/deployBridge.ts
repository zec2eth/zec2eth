import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { sleep } from "../utils";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const constructorArguments = [
    "0x8483F803BB438De8068ca3B72aEA17e73e75FF85",
    "0xe97BcaFd6b75c1EF765912451d65a5c5f23A5Eb2",
    "0xBdc3f1A02e56CD349d10bA8D2B038F774ae22731",
    0,
  ];

  const deployed = await deploy("ZecToEthFHEBridge", {
    from: deployer,
    args: constructorArguments,
    log: true,
  });

  console.log(`ZecToEthFHEBridge contract: `, deployed.address);

  const verificationArgs = {
    address: deployed.address,
    constructorArguments,
    contract: "contracts/ZecBridge.sol:ZecToEthFHEBridge",
  };

  console.info("\nSubmitting verification request on scanner...");
  await sleep(30000); // wait for arbiscan to index the contract
  await hre.run("verify:verify", verificationArgs);
};

export default func;
func.id = "deploy_ZecBridge"; // id required to prevent reexecution
func.tags = ["ZecBridge"];

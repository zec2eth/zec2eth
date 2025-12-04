import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { sleep } from "../utils";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployed = await deploy("Groth16Verifier", {
    from: deployer,
    log: true,
  });

  console.log(`Groth16Verifier contract: `, deployed.address);

  const verificationArgs = {
    address: deployed.address,
    contract: "contracts/Verifier.sol:Groth16Verifier",
  };

  console.info("\nSubmitting verification request on scanner...");
  await sleep(30000); // wait for arbiscan to index the contract
  await hre.run("verify:verify", verificationArgs);
};

export default func;
func.id = "deploy_Verifier"; // id required to prevent reexecution
func.tags = ["Verifier"];

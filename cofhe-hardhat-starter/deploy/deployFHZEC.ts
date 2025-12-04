import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { sleep } from "../utils";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployed = await deploy("FHZEC", {
    from: deployer,
    log: true,
  });

  console.log(`FHZEC contract: `, deployed.address);

  const verificationArgs = {
    address: deployed.address,
    contract: "contracts/token/FHZEC.sol:FHZEC",
  };

  console.info("\nSubmitting verification request on scanner...");
  await sleep(30000); // wait for arbiscan to index the contract
  await hre.run("verify:verify", verificationArgs);
};

export default func;
func.id = "deploy_FHZEC"; // id required to prevent reexecution
func.tags = ["FHZEC"];

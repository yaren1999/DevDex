const { ethers } = require("hardhat");

async function main(){
    const TokenA = await ethers.getContractFactory("TokenA");
    const tokenA = await TokenA.deploy();
    await tokenA.waitForDeployment(); 
    console.log("TokenA Adresi:", await tokenA.getAddress());


    const TokenB = await ethers.getContractFactory("TokenB");
    const tokenB = await TokenB.deploy();
    await tokenB.waitForDeployment();
    console.log("TokenB Adresi:", await tokenB.getAddress());

    
    const DevSwap = await ethers.getContractFactory("DevSwap");
    const swap = await DevSwap.deploy(
        await tokenA.getAddress(),
        await tokenB.getAddress()
    );
    await swap.waitForDeployment();
    console.log("DevSwap Adresi:", await swap.getAddress());
}
main().catch(console.error);
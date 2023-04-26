// const Web3 = require("web3");
// const web3 = new Web3('')
require('dotenv').config();
const express = require('express');
const ethers = require("ethers");
const app = express();
const inquirer = require('inquirer');



let initialLiquidityDetected = false;
let jmlBnb = 0;


const mnemonic = process.env.YOUR_MNEMONIC;

// const bscMainnetUrl = 'https://bsc-dataseed1.defibit.io'; //https://bsc-dataseed.binance.org,  https://bsc-dataseed1.defibit.io// const nodewss = 'https://bsc-dataseed.binance.org/';
const testnetUrl = 'https://data-seed-prebsc-1-s3.binance.org:8545/';
const provider = new ethers.providers.JsonRpcProvider(testnetUrl)
const wallet = new ethers.Wallet(mnemonic)
const account = wallet.connect(provider);


const factory = new ethers.Contract(
    process.env.FACTORY,
    [
        'event PairCreated(address indexed token0, address indexed token1, address pair, uint)',
        'function getPair(address tokenA, address tokenB) external view returns (address pair)'
    ],
    account
);

const router = new ethers.Contract(
    process.env.ROUTER,
    [
        'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
        'function getAmountsIn(uint amountOut, address[] memory path) internal view returns (uint[] memory amounts)',
        'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline)',
        'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
        'function swapExactTokensForTokensSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
        'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
        'function swapExactETHForTokensSupportingFeeOnTransferTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable',
        // 'function swapTokensForExactTokens(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts);'
    ],
    account
);

const erc = new ethers.Contract(
    process.env.WBNB,
    [{
        "constant": true,
        "inputs": [{ "name": "_owner", "type": "address" }],
        "name": "balanceOf",
        "outputs": [{ "name": "balance", "type": "uint256" }],
        "payable": false,
        "type": "function"
    }],
    account
);

const sellTokenErc = new ethers.Contract(
    process.env.TOKEN_ADDRESS,
    [{
        "constant": true,
        "inputs": [{ "name": "_owner", "type": "address" }],
        "name": "balanceOf",
        "outputs": [{ "name": "balance", "type": "uint256" }],
        "payable": false,
        "type": "function"
    }],
    account
)
const approveABI = ['function approve(address spender, uint256 amount) public returns (bool)'];
const wbnbContract = new ethers.Contract(process.env.WBNB, approveABI, account);
const tokenContract = new ethers.Contract(process.env.TOKEN_ADDRESS, approveABI, account);





console.log(`
    /$$   /$$           /$$$$$$$$                           /$$ /$$                     /$$$$$$$              /$$          
   | $$  | $$          |__  $$__/                          | $$|__/                    | $$__  $$            | $$          
   | $$  | $$ /$$$$$$$$   | $$     /$$$$$$   /$$$$$$   /$$$$$$$ /$$ /$$$$$$$   /$$$$$$ | $$  \ $$  /$$$$$$  /$$$$$$        
   | $$  | $$|____ /$$/   | $$    /$$__  $$ |____  $$ /$$__  $$| $$| $$__  $$ /$$__  $$| $$$$$$$  /$$__  $$|_  $$_/        
   | $$  | $$   /$$$$/    | $$   | $$  \__/  /$$$$$$$| $$  | $$| $$| $$  \ $$| $$  \ $$| $$__  $$| $$  \ $$  | $$          
   | $$  | $$  /$$__/     | $$   | $$       /$$__  $$| $$  | $$| $$| $$  | $$| $$  | $$| $$  \ $$| $$  | $$  | $$ /$$      
   |  $$$$$$/ /$$$$$$$$   | $$   | $$      |  $$$$$$$|  $$$$$$$| $$| $$  | $$|  $$$$$$$| $$$$$$$/|  $$$$$$/  |  $$$$/      
    \______/ |________/   |__/   |__/       \_______/ \_______/|__/|__/  |__/ \____  $$|_______/  \______/    \___/        
                                                                              /$$  \ $$                                    
                                                                             |  $$$$$$/                                    
                                                                              \______/`)                          
let approveWBNB = async () => {
    console.log('Start approving...');
    const amountApproveWbnb = await ethers.utils.parseUnits(process.env.AMOUNT_OF_WBNB, 'ether');
    const approveToken = await wbnbContract.approve(
        account.address,
        amountApproveWbnb
    );

    await approveToken.wait()

    console.log('approve token: wbnb');
}


let approveToken = async () => {
    console.log('=====================================')
    console.log('Start approve token');

    const approveToken = await tokenContract.approve(process.env.ROUTER, ethers.constants.MaxUint256);

    await approveToken.wait();
    console.log(`approve token: ${process.env.TOKEN_ADDRESS}`);
    console.log('=====================================')
}

const run = async () => {

    await checkLiq();
}


let tokenIn = process.env.WBNB;
let tokenOut = process.env.TOKEN_ADDRESS;

let checkLiq = async () => {
    const pairAddressx = await factory.getPair(tokenIn, tokenOut);
    console.log(`pairAddress: ${pairAddressx}`);


    if (pairAddressx !== null && pairAddressx !== undefined) {
        if (pairAddressx.toString().indexOf('0x0000000000000') > -1) {
            console.log(`pairAddress ${pairAddressx} not detected. Auto restart`);
            return await run();
        }
    }



    const pairBNBvalue = await erc.balanceOf(pairAddressx);
    jmlBnb = await ethers.utils.formatEther(pairBNBvalue);
    console.log(`Liquidity BNB : ${jmlBnb}`);
    if (jmlBnb > process.env.MIN_LIQUIDITY_ADDED) {
        await approveWBNB()
        
        setTimeout(() => buyAction(), 3000);
    }
    else {
        initialLiquidityDetected = false;
        console.log('run again...');
        return await run();
    }
}




let buyAction = async () => {
    if (initialLiquidityDetected === true) {
        console.log('not buy cause already buy');
        return null;
    }



    console.log('ready to buy');

    try {
        initialLiquidityDetected = true;

        let amountOutMin = 0;
        let SLIPPAGE = process.env.SLIPPAGE;

        const amountIn = ethers.utils.parseUnits(`${process.env.AMOUNT_OF_WBNB}`, 'ether');
 
        if (parseInt(SLIPPAGE) !== 0) {
            const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut])
            amountOutMin = amounts[1].sub(amounts[1].div(`${SLIPPAGE}`))

        }

        console.log(
            `Start to buy \n`
            +
            `Buying Token
        =================
        tokenIn: ${(amountIn * 1e-18).toString()} ${tokenIn} (BNB)
        tokenOut: ${(amountOutMin / 1e-18).toString()} ${tokenOut} }
      `);

        console.log('Processing Transaction.....');
        console.log(`amountIn: ${(amountIn * 1e-18)} ${tokenIn} (BNB)`);
        console.log(`amountOutMin: ${amountOutMin / 1e-18}`);
        console.log(`tokenIn: ${tokenIn}`);
        console.log(`tokenOut: ${tokenOut}`);
        console.log(`recipient: ${process.env.YOUR_ADDRESS}`);
        console.log(`gasLimit: ${process.env.GAS_LIMIT}`);
        console.log(`gasPrice: ${process.env.GWEI} (gwei)`);
        let gasObject = {
            'gasPrice': ethers.utils.parseUnits(process.env.GWEI, 'gwei'),
            'gasLimit': process.env.GAS_LIMIT,
            'value': amountIn
        }
        const tx = await router.swapExactETHForTokens(
            0,
            [tokenIn, tokenOut],
            account.getAddress(),
            Date.now() + 1000 * 60 * 5, //5 minutes
            gasObject
        );
        const receipt = await tx.wait();
        await approveToken();
        console.log(`Transaction receipt : https://testnet.bscscan.com/tx/${receipt.logs[1].transactionHash}`);
        console.log('======================================================')
        const balanceOfNewToken = await sellTokenErc.balanceOf(wallet.address);
        const balance = ethers.utils.formatEther(balanceOfNewToken);
        await sellAction(balance)
        setTimeout(() => { process.exit() }, 2000);

    } catch (err) {
        let error = JSON.parse(JSON.stringify(err));
        console.log(err)
        console.log(`Error caused by : 
        {
        reason : ${error.reason},
        transactionHash : ${error.transactionHash}
        message : Please check your BNB/WBNB balance, maybe its due because insufficient balance or approve your token manually on pancakeSwap
        }`);
        // console.log(error);

        inquirer.prompt([
            {
                type: 'confirm',
                name: 'runAgain',
                message: 'Do you want to run again this bot?',
            },
        ])
            .then(answers => {
                if (answers.runAgain === true) {
                    console.log('= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =');
                    console.log('Run again');
                    console.log('= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =');
                    initialLiquidityDetected = false;
                    run();
                } else {
                    process.exit();
                }
            });
    }
}

const sellAction = async (sellQuantity) => {
    try {
         
        let amountInMin = 0
        let amountOut = ethers.utils.parseEther(sellQuantity)
        if (parseInt(process.env.SLIPPAGE) !== 0) {
            let amounts = await router.getAmountsIn(amountOut, [tokenIn, tokenOut])
            amountInMin = amounts[0].sub(amounts[0].div(`${process.env.SLIPPAGE}`))
        }

        console.log(`
    Selling Token
    =================
    tokenOut: ${ethers.utils.formatEther(amountOut).toString()} ${tokenOut} (New Token)
    tokenIn: ${ethers.utils.formatEther(amountInMin).toString()} ${tokenIn} (BNB)
    `)
    let gasObject = {
        'gasPrice': ethers.utils.parseUnits(process.env.GWEI, 'gwei'),
        'gasLimit': process.env.GAS_LIMIT
    }
        let tx
        tx = await router.swapExactTokensForETH(
            amountOut,
            amountInMin,
            [tokenOut, tokenIn],
            account.address,
            Date.now() + 1000 * 60 * 5, //5 minutes
            gasObject
            );
        const receipt = await tx.wait();
        console.log(`Transaction receipt : https://testnet.bscscan.com/tx/${receipt.logs[1].transactionHash}`);
        console.log('======================================================')

        setTimeout(() => { process.exit() }, 2000);

    } catch (err) {
        let error = JSON.parse(JSON.stringify(err));
        console.log(err)
        console.log(`Error caused by : 
        {
        reason : ${error.reason},
        transactionHash : ${error.transactionHash}
        message : Please check your BNB/WBNB balance, maybe its due because insufficient balance or approve your token manually on pancakeSwap
        }`);
        // console.log(error);

        inquirer.prompt([
            {
                type: 'confirm',
                name: 'runAgain',
                message: 'Do you want to run again this bot?',
            },
        ])
            .then(answers => {
                if (answers.runAgain === true) {
                    console.log('= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =');
                    console.log('Run again');
                    console.log('= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =');
                    initialLiquidityDetected = false;
                    run();
                } else {
                    process.exit();
                }
            });
    }
}

run()


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`server listener: ${PORT}`);
});
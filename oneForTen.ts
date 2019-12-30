/*
* The famous "send me 1 BCH I'll send you back 10 BCH" tweets that was rampant in the last bull run in '17
* Alice is the person making the initial deposit (set to 5 sats) and Bob is the person with the contract
* that will return the 10x amount back to Alice
* 
* 3 conditions need to be satisfied:
*	1. PK matches PKH
*	2. Initial sender(Alice) signature matches
*	3. Checks whether the 10x sender(Bob) has a balance that can cover the 10x transaction
*	4. Checks whether the 10x amount exceeds the ceiling amount set by Bob's contract
*/

import { BITBOX } from 'bitbox-sdk';
import { TxnDetailsResult } from 'bitcoin-com-rest';
import { ECPair, HDNode } from 'bitcoincashjs-lib';
import { Contract, Instance, Sig } from 'cashscript';
import * as path from 'path';

run();
export async function run(): Promise<void> {
  // Initialise BITBOX
  const network: string = 'testnet';
  const bitbox: BITBOX = new BITBOX({ restURL: 'https://trest.bitcoin.com/v2/' });

    // Initialise HD node and alice and bob's keypair
  const rootSeed: Buffer = bitbox.Mnemonic.toSeed('CashScript');
  const hdNode: HDNode = bitbox.HDNode.fromSeed(rootSeed, network);
  const alice: ECPair = bitbox.HDNode.toKeyPair(bitbox.HDNode.derive(hdNode, 0));
  const bob: ECPair = bitbox.HDNode.toKeyPair(bitbox.HDNode.derive(hdNode, 1));

  // mock inputs from theoretical Dapp interface
  const aliceDeposit = 5; //in sats
  const max10xReturn = 100;
  
  // Derive alice's public key and public key hash
  const alicePk: Buffer = bitbox.ECPair.toPublicKey(alice);
  const alicePkh: Buffer = bitbox.Crypto.hash160(alicePk);

  // Derive bob's public key and public key hash
  const bobPk: Buffer = bitbox.ECPair.toPublicKey(bob);
  const bobPkh: Buffer = bitbox.Crypto.hash160(bobPk);

  // Compile the P2PKH Cash Contract
  const P2PKH: Contract = Contract.compile(path.join(__dirname, 'oneForTen.cash'), network);

  // Instantiate a new P2PKH contract with constructor arguments:
  const aliceInstance: Instance = P2PKH.new(alicePkh);
  const bobInstance: Instance = P2PKH.new(bobPkh);

  // Get bob contract's balance it will be the one sending the 10x balance back
  const bobContractBalance: number = await bobInstance.getBalance();

  // Get initial contract balance & output address for alice & bob
  console.log('alice address:', await aliceInstance.address);
  console.log('bob address:', await bobInstance.address);
  console.log('alice contract balance:', await aliceInstance.getBalance());
  console.log('bob contract balance:', bobContractBalance);

  // Call the spend function with alice's signature + pk and send initial deposit to bob's oneForTen smart contract
  const tx: TxnDetailsResult = await aliceInstance.functions.spend(alicePk, new Sig(alice))
    .send(bobInstance.address, aliceDeposit);
  
  console.log('transaction details:', tx);
  
  // validates alice's deposit against bob's smart contract rules
  // Sends the return 10x amount if all rules are satisfied
  const txReturn: TxnDetailsResult = await bobInstance.functions.validateDeposit(bobContractBalance, aliceDeposit, max10xReturn)
	.send(aliceInstance.address, max10xReturn);
  
  console.log('transaction details:', txReturn);
  
  // Displays the updated balances for alice and bob
  console.log('alice new contract balance:', await aliceInstance.getBalance());
  console.log('bob new contract balance:', await bobInstance.getBalance());
  
}

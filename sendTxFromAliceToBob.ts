/*
* Demonstration of:
* - Retireving public key and public key hashes
* - Instantiate an existing *.cash contract
* - Calling on spend() from p2pkh.cash to check whether spender's (Alice) pk/pkh and signature matches
* - Sending 10k sats from Alice to Bob
* 
* Note: the '@ts-ignore' below is not a comment but rather a flag to avoid TypeScript compilation errors
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

  // Derive alice's public key and public key hash
  const alicePk: Buffer = bitbox.ECPair.toPublicKey(alice);
  const alicePkh: Buffer = bitbox.Crypto.hash160(alicePk);

  // Derive bob's public key and public key hash
  const bobPk: Buffer = bitbox.ECPair.toPublicKey(bob);
  const bobPkh: Buffer = bitbox.Crypto.hash160(bobPk);

  // Compile the P2PKH Cash Contract
  const P2PKH: Contract = Contract.compile(path.join(__dirname, 'p2pkh.cash'), network);

  // Instantiate a new P2PKH contract with constructor arguments:
  const aliceInstance: Instance = P2PKH.new(alicePkh);
  const bobInstance: Instance = P2PKH.new(bobPkh);

  // Get contract balance & output address for alice & bob
  console.log('alice contract address:', aliceInstance.address);
  console.log('alice contract balance:', await aliceInstance.getBalance());
  console.log('bob contract address:', bobInstance.address);
  console.log('bob contract balance:', await bobInstance.getBalance());

  // Call the spend function with alice's signature + pk and send to bob's address
  // And use it to send 0. 000 100 00 BCH back to bob's address
  const tx: TxnDetailsResult = await aliceInstance.functions.spend(alicePk, new Sig(alice))
    .send(bobInstance.address, 10000);
  console.log('transaction details:', tx);

  console.log('alice new contract balance:', await aliceInstance.getBalance());
  console.log('bob new contract balance:', await bobInstance.getBalance());
  
}

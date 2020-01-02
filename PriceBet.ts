import { BITBOX } from 'bitbox-sdk';
import { TxnDetailsResult } from 'bitcoin-com-rest';
import { ECPair, HDNode } from 'bitcoincashjs-lib';
import { Contract, Instance, Sig } from 'cashscript';
import * as path from 'path';
import { PriceOracle } from './PriceOracle';

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
  const escrow: ECPair = bitbox.HDNode.toKeyPair(bitbox.HDNode.derive(hdNode, 2)); // theoretical contract holding the deposited bets

  // Derive alices public key and public key hash
  const alicePk: Buffer = bitbox.ECPair.toPublicKey(alice);
  const alicePkh: Buffer = bitbox.Crypto.hash160(alicePk);

  // Derive bob's public key and public key hash
  const bobPk: Buffer = bitbox.ECPair.toPublicKey(bob);
  const bobPkh: Buffer = bitbox.Crypto.hash160(bobPk);
  
  // Derive escrow's public key and public key hash
  const escrowPk: Buffer = bitbox.ECPair.toPublicKey(escrow);
  const escrowPkh: Buffer = bitbox.Crypto.hash160(escrowPk);  

  // Compile the P2PKH Cash Contract
  const P2PKH: Contract = Contract.compile(path.join(__dirname, 'PriceBet.cash'), network);

  // Initialise price oracle with a keypair
  const oracle: PriceOracle = new PriceOracle(
    bitbox.HDNode.toKeyPair(bitbox.HDNode.derive(hdNode, 3)),
  );

  // Instantiate a new escrow P2PKH contract with constructor arguments:
  const aliceInstance: Instance = P2PKH.new(alicePkh, "", "", 0, 0); 
  const bobInstance: Instance = P2PKH.new(bobPkh, "", "", 0, 0);
  const escrowInstance: Instance = P2PKH.new(escrowPkh,
    bitbox.ECPair.toPublicKey(escrow),
    bitbox.ECPair.toPublicKey(oracle.keypair),
    597000,
    30000,
  );

  // inputs from mock client interface
  const wager = 1; //in sats
  const totalWager = wager+wager;
  const alicePrediction = 29000;
  const bobPrediction = 37000;

  // Get initial contract balance & output address for alice & bob
  console.log('alice address:', await aliceInstance.address, '\n', 'alice balance:', await aliceInstance.getBalance());
  console.log('bob address:', await bobInstance.address,'\n', 'bob balance:', await bobInstance.getBalance());
  console.log('escrow address:', await escrowInstance.address, '\n', 'escrow contract balance:', await escrowInstance.getBalance());

  // alice makes deposits the agreed wager from her wallet to the betting escrow
  const aliceTx: TxnDetailsResult = await aliceInstance.functions.spend(alicePk, new Sig(alice))
    .send(escrowInstance.address, wager);
  console.log('Alice', wager, ' deposit complete');
  
  // bob makes deposits the agreed wager from his wallet to the betting escrow
  const bobTx: TxnDetailsResult = await bobInstance.functions.spend(bobPk, new Sig(bob))
    .send(escrowInstance.address, wager);
  console.log('Bob', wager, ' deposit complete');
  
  //***** currently lacking the abiliity to pass in two prediction params to a contract and
  //	  have that contract return the winner between two prediction params
  //	  Putting this on pause until the appropriate cashscript release.
  //*****
  
  /*
  // Produce new oracle message and signature
  const oracleMessage: Buffer = oracle.createMessage(597000, 30000);
  const oracleSignature: Buffer = oracle.signMessage(oracleMessage);

  // Spend from the vault
  const escrowTx: TxnDetailsResult = await instance.functions
    .releaseTotalWager(new Sig(owner), oracleSignature, oracleMessage)
    .send(instance.address, totalWager); // send to winner address instead of instance.address
  */
  console.log('\n', 'escrow new contract balance:', await escrowInstance.getBalance(), '\n', 'alice new contract balance:', await aliceInstance.getBalance(), '\n', 'bob new contract balance:', await bobInstance.getBalance());
    
  
}

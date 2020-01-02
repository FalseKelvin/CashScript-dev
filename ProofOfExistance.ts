import { BITBOX } from 'bitbox-sdk';
import { TxnDetailsResult } from 'bitcoin-com-rest';
import { ECPair, HDNode } from 'bitcoincashjs-lib';
import { Contract, Instance, Sig } from 'cashscript';
import * as path from 'path';
import { readFileSync } from 'fs';
import {Md5} from 'ts-md5/dist/md5';

run();
export async function run(): Promise<void> {
  // Initialise BITBOX
  const network: string = 'testnet';
  const bitbox: BITBOX = new BITBOX({ restURL: 'https://trest.bitcoin.com/v2/' });

  // Initialise HD node and alice and bob's keypair
  const rootSeed: Buffer = bitbox.Mnemonic.toSeed('CashScript');
  const hdNode: HDNode = bitbox.HDNode.fromSeed(rootSeed, network);
  const alice: ECPair = bitbox.HDNode.toKeyPair(bitbox.HDNode.derive(hdNode, 0));

  // Derive alice's public key and public key hash
  const alicePk: Buffer = bitbox.ECPair.toPublicKey(alice);
  const alicePkh: Buffer = bitbox.Crypto.hash160(alicePk);

  // Compile the P2PKH Cash Contract
  const P2PKH: Contract = Contract.compile(path.join(__dirname, 'p2pkh.cash'), network);

  // Instantiate a new P2PKH contract with constructor arguments:
  const instance: Instance = P2PKH.new(alicePkh);

  // Get contract balance & output address for alice
  console.log('alice contract address:', instance.address, '\n', 'alice contract balance:', await instance.getBalance());

  // parse the ProofOfExistance.txt document and generate a simple Md5 hash
  const document = readFileSync('./ProofOfExistance.txt', 'utf-8');
  const documentHash = Md5.hashStr(document);
  console.log('Document Md5 Hash: ', documentHash);

  // Call the spend function with alice's signature + pk
  // And use it to post document hash to memo
  try {
    const tx2: TxnDetailsResult = await instance.functions.spend(alicePk, new Sig(alice))
      .send([
        { opReturn: ['0x6d02', String(documentHash)] },
      ]);
    console.log('transaction details:', tx2);
  } catch (e) {
    console.log(e);
  }

}

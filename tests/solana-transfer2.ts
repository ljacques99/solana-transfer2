import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaModule } from "../target/types/solana_module";
import { SystemProgram, LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";
import assert from "assert";

describe("my-transfer-program", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SolanaModule as Program<SolanaModule>;

  let senderWallet: anchor.web3.Keypair;
  let receiverWallet: anchor.web3.Keypair;

  before(async () => {
    // 1. Crear un sender y un receiver
    senderWallet = anchor.web3.Keypair.generate();
    receiverWallet = anchor.web3.Keypair.generate();

    // 2. Airdrop a sender para que tenga SOL para transferir
    await provider.connection.requestAirdrop(senderWallet.publicKey, 10 * LAMPORTS_PER_SOL); // 10 SOL
    await provider.connection.requestAirdrop(receiverWallet.publicKey, 1 * LAMPORTS_PER_SOL); // 1 SOL inicial para el receiver

    // Esperar a que los airdrops se confirmen
    await new Promise(resolve => setTimeout(resolve, 1000)); // Pequeña pausa para asegurar confirmación

    const senderBalance = await provider.connection.getBalance(senderWallet.publicKey);
    const receiverBalance = await provider.connection.getBalance(receiverWallet.publicKey);
    console.log(`Sender initial balance: ${senderBalance / LAMPORTS_PER_SOL} SOL`);
    console.log(`Receiver initial balance: ${receiverBalance / LAMPORTS_PER_SOL} SOL`);
  });

  it("Transfers SOL from sender to receiver", async () => {
    const amountToTransfer = 2 * LAMPORTS_PER_SOL; // 2 SOL

    // Obtener balances antes de la transferencia
    const senderBalanceBefore = await provider.connection.getBalance(senderWallet.publicKey);
    const receiverBalanceBefore = await provider.connection.getBalance(receiverWallet.publicKey);

    // Llamar a la instrucción transfer_sol de tu programa Anchor
    /* const tx = await program.methods
      .transferSol(new anchor.BN(amountToTransfer))
      .accounts({
        sender: senderWallet.publicKey,
        receiver: receiverWallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([senderWallet]) // El sender DEBE firmar la transacción
      .rpc(); */

    // version avec le payeur des fees = sender
    const instruction = await program.methods
      .transferSol(new anchor.BN(amountToTransfer))
      .accounts({
        sender: senderWallet.publicKey,
        receiver: receiverWallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
    
    const transaction = new Transaction().add(instruction); // créer la transaction à partir de l'instruction

    transaction.feePayer=senderWallet.publicKey;

    transaction.recentBlockhash = (await provider.connection.getLatestBlockhash()).blockhash;

    const signers = [senderWallet];

    transaction.sign(...signers);

    const tx = await provider.connection.sendRawTransaction(transaction.serialize());
    const confirmation = await provider.connection.confirmTransaction({
      signature: tx,
      blockhash: transaction.recentBlockhash,
      lastValidBlockHeight: (await provider.connection.getLatestBlockhash()).lastValidBlockHeight
    })


    console.log("Transaction signature", tx);

    // Obtener balances después de la transferencia
    const senderBalanceAfter = await provider.connection.getBalance(senderWallet.publicKey);
    const receiverBalanceAfter = await provider.connection.getBalance(receiverWallet.publicKey);

    console.log(`Sender balance after: ${senderBalanceAfter / LAMPORTS_PER_SOL} SOL`);
    console.log(`Receiver balance after: ${receiverBalanceAfter / LAMPORTS_PER_SOL} SOL`);

    // Asunciones para la verificación (considerando tarifas de transacción)
    // El balance del sender debería haber disminuido en (amountToTransfer + fee)
    // El balance del receiver debería haber aumentado en amountToTransfer
    const expectedReceiverBalance = receiverBalanceBefore + amountToTransfer;
    
    // Aquí es donde la verificación se vuelve un poco más compleja debido a las tarifas de transacción.
    // El sender paga tanto el monto transferido como las tarifas de la transacción.
    // El receiver solo recibe el monto transferido.

    // Verifica que el receiver recibió la cantidad exacta
    assert.equal(receiverBalanceAfter, expectedReceiverBalance, "Receiver balance should increase by transfer amount");

    // Verifica que el sender tiene menos, considerando la transferencia y la tarifa
    // Calculamos el balance esperado restando el monto y esperamos que sea ligeramente menor debido a la tarifa
    const minExpectedSenderBalance = senderBalanceBefore - amountToTransfer - (0.000005 * LAMPORTS_PER_SOL); // Estimado de tarifa
    assert.ok(senderBalanceAfter < senderBalanceBefore, "Sender balance should decrease");
    assert.ok(senderBalanceAfter >= minExpectedSenderBalance, "Sender balance should be close to expected after fees");

  });
});

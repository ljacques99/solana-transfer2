use anchor_lang::prelude::*;
use anchor_lang::system_program; // Importa el System Program

declare_id!("CFHwnFymbR5LSp8TBqUnVJZvWaEFb79xj3723TJviGkw");

#[program]
pub mod solana_module {
    use super::*;
    pub fn transfer_sol(ctx: Context<TransferSol>, amount: u64) -> Result<()> {
        // 1. Crear la instrucción de transferencia
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(), // El System Program es el 'owner' de la instrucción
            system_program::Transfer {
                from: ctx.accounts.sender.to_account_info(), // La cuenta que envía los SOL
                to: ctx.accounts.receiver.to_account_info(), // La cuenta que recibe los SOL
            },
        );
        // 2. Invocar la instrucción de transferencia
        system_program::transfer(cpi_context, amount)?;

        Ok(())
    }
}

// Estructura para los parámetros de la instrucción transfer_sol
#[derive(Accounts)]

pub struct TransferSol<'info> {
    /// CHECK: La cuenta sender se valida por ser signataria y writable. El system_program se asegura de que tiene suficientes SOL.
    #[account(mut)]
    pub sender: Signer<'info>, // La cuenta que envía los SOL. Debe firmar la transacción y ser mutable.

    /// CHECK: La cuenta receiver solo necesita ser mutable para recibir los SOL. No necesita firmar.
    #[account(mut)]
    pub receiver: AccountInfo<'info>, // La cuenta que recibe los SOL. Debe ser mutable.

    pub system_program: Program<'info, System>, // El System Program nativo de Solana.
}


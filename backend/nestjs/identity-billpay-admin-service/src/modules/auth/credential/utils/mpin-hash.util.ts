// Re-exports the shared scrypt-based PIN hasher (src/common/utils/pin-hash.util.ts) under its
// original MPIN-specific names — also used directly (as hashPin/verifyPin) for ATM PIN in the
// bank-account module.
export { hashPin as hashMpin, verifyPin as verifyMpin } from '../../../../common/utils/pin-hash.util';

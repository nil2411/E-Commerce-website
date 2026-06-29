import assert from 'node:assert/strict'
import test from 'node:test'
import mongoose from 'mongoose'
import {
  MAX_ITEM_QUANTITY,
  normalizeRequestedItems,
  getReceiptFields
} from '../services/orderService.js'

test('normalizeRequestedItems merges duplicate product-size pairs', () => {
  const productId = new mongoose.Types.ObjectId().toString()

  const result = normalizeRequestedItems([
    { _id: productId, size: 'M', quantity: 1 },
    { productId, size: 'M', quantity: 2 },
    { productId, size: 'L', quantity: 1 }
  ])

  assert.equal(result.length, 2)
  assert.deepEqual(result.find((item) => item.size === 'M'), {
    productId,
    size: 'M',
    quantity: 3
  })
})

test('normalizeRequestedItems rejects invalid quantities', () => {
  const productId = new mongoose.Types.ObjectId().toString()
  assert.throws(
    () => normalizeRequestedItems([{ productId, size: 'M', quantity: MAX_ITEM_QUANTITY + 1 }]),
    /invalid product, size, or quantity/i
  )
})

test('getReceiptFields generates receipt metadata', () => {
  const order = { _id: new mongoose.Types.ObjectId(), receiptNumber: '' }
  const fields = getReceiptFields(order, 'pay_123')

  assert.equal(fields.payment, true)
  assert.equal(fields.paymentStatus, 'paid')
  assert.equal(fields.paymentId, 'pay_123')
  assert.equal(typeof fields.receiptNumber, 'string')
  assert.ok(fields.receiptNumber.startsWith('RCP-'))
})

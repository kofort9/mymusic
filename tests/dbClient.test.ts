jest.mock('../src/dbClient', () => {
  const actual = jest.requireActual('../src/dbClient');
  return {
    ...actual,
    prisma: {
      $disconnect: jest.fn().mockResolvedValue(undefined),
    },
  };
});

const { prisma, disconnectPrisma } = require('../src/dbClient');

describe('dbClient', () => {
  test('disconnectPrisma resolves on success', async () => {
    await expect(disconnectPrisma()).resolves.toBeUndefined();
  });

  test('disconnectPrisma swallows errors', async () => {
    (prisma.$disconnect as jest.Mock).mockRejectedValueOnce(new Error('fail'));
    await expect(disconnectPrisma()).resolves.toBeUndefined();
  });
});

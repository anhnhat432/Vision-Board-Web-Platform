import { MongoUserRepository } from "../repositories/mongo/MongoUserRepository";
import type { UpdateUserData, UserEntity } from "../repositories/mongo/MongoUserRepository";

class AuthService {
  constructor(private readonly userRepository: MongoUserRepository) {}

  async findOrCreateUser(
    uid: string,
    email: string,
    name: string | undefined,
  ): Promise<UserEntity> {
    return this.userRepository.findOrCreate(uid, email, name ?? "");
  }

  async getUserByFirebaseUid(uid: string): Promise<UserEntity | null> {
    return this.userRepository.findByFirebaseUid(uid);
  }

  async updateUserProfile(uid: string, updates: UpdateUserData): Promise<UserEntity | null> {
    return this.userRepository.updateByFirebaseUid(uid, updates);
  }
}

const userRepository = new MongoUserRepository();

export const authService = new AuthService(userRepository);

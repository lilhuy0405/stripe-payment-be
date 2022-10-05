import {Repository} from "typeorm";
import {User} from "../entity/User";
import {AppDataSource} from "../data-source";

export default class UserService {
  private readonly userRepository: Repository<User>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
  }

  async save(user: User): Promise<User> {
    return await this.userRepository.save(user);
  }
}
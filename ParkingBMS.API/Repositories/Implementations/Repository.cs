using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using ParkingBMS.API.Data;
using ParkingBMS.API.Repositories.Interfaces;

namespace ParkingBMS.API.Repositories.Implementations
{
    public class Repository<T> : IRepository<T> where T : class
    {
        protected readonly AppDbContext _context;
        protected readonly DbSet<T> _dbSet;

        public Repository(AppDbContext context)
        {
            _context = context;
            _dbSet = context.Set<T>();
        }

        public async Task<T?> GetByIdAsync(object id)
        {
            return await _dbSet.FindAsync(id);
        }

        public async Task<IEnumerable<T>> GetAllAsync()
        {
            return await _dbSet.ToListAsync();
        }

        public IQueryable<T> GetQueryable()
        {
            return _dbSet;
        }

        public async Task<IEnumerable<T>> FindAsync(Expression<Func<T, bool>> predicate)
        {
            return await _dbSet.Where(predicate).ToListAsync();
        }

        public async Task AddAsync(T entity)
        {
            await _dbSet.AddAsync(entity);
        }

        public void Update(T entity)
        {
            _dbSet.Update(entity);
        }

        public void Delete(T entity)
        {
            // Soft delete logic can be handled here if entity implements a custom interface
            // or simply handled in services. Since we use EF Core query filters for IsActive,
            // we can set IsActive=false inside services and call Update, or do it here via reflection.
            // Let's implement reflection-based soft delete if the property exists, else hard delete.
            var isActiveProp = entity.GetType().GetProperty("IsActive");
            if (isActiveProp != null && isActiveProp.PropertyType == typeof(bool))
            {
                isActiveProp.SetValue(entity, false);
                _dbSet.Update(entity);
            }
            else
            {
                _dbSet.Remove(entity);
            }
        }

        public async Task<int> SaveChangesAsync()
        {
            return await _context.SaveChangesAsync();
        }
    }
}
